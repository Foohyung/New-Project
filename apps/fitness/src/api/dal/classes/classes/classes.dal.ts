import 'server-only';
import { addDays } from '@/api/lib/utils/utils/utils';
import { classState, decideBooking, decideCancel, type BookingDecision, type CancelDecision } from '@/api/services/classes/classes/classes.service';
import type { ClassDetailDto, ClassDto } from '@/api/types/classes/classes/classes.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { bangkokSpan, packagesById, prismaAs, toClass, toMember, trainerNicknames, transaction, type ClassRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { toMemberDto } from '@/api/dal/members/members/members.dal';

/** จำนวนที่จองแล้วของแต่ละคลาส (รวมผู้จองนอกระบบ) */
async function bookedCounts(db: Tx, classes: ClassRecord[]): Promise<Map<string, number>> {
  const rows = await db.booking.groupBy({ by: ['classId'], where: { classId: { in: classes.map(c => c.id) }, status: 'booked' }, _count: true });
  const counted = new Map(rows.map(r => [r.classId, r._count]));
  return new Map(classes.map(c => [c.id, c.otherBooked + (counted.get(c.id) ?? 0)]));
}

async function toClassDtos(db: Tx, classes: ClassRecord[], session: Session, instant: Date): Promise<ClassDto[]> {
  const [booked, nicknames, mine] = await Promise.all([
    bookedCounts(db, classes),
    trainerNicknames(db),
    session.memberId ? db.booking.findMany({ where: { memberId: session.memberId, status: 'booked', classId: { in: classes.map(c => c.id) } } }) : Promise.resolve([]),
  ]);
  return classes.map(c => ({
    id: c.id,
    title: c.title,
    trainerId: c.trainerId,
    trainerName: nicknames.get(c.trainerId) ?? '—',
    room: c.room,
    startsAt: c.startsAt,
    minutes: c.minutes,
    capacity: c.capacity,
    booked: booked.get(c.id) ?? c.otherBooked,
    level: c.level,
    state: classState(c.startsAt, c.minutes, instant),
    myBookingId: mine.find(b => b.classId === c.id)?.id ?? null,
  }));
}

function canViewSchedule(session: Session): Promise<void> {
  return can(session, 'classes.view') || can(session, 'portal.use') ? Promise.resolve() : Promise.reject(new ForbiddenError());
}

/** ตารางคลาสตั้งแต่วันที่ `from` จำนวน `days` วัน เรียงตามเวลาเริ่ม */
export async function listClasses(session: Session, from: string, days = 7): Promise<ClassDto[]> {
  await canViewSchedule(session);
  const db = prismaAs(session);
  const rows = await db.gymClass.findMany({ where: { startsAt: bangkokSpan(from, addDays(from, days - 1)) }, orderBy: { startsAt: 'asc' } });
  return toClassDtos(db, rows.map(toClass), session, now());
}

export async function getClassDetail(session: Session, id: string): Promise<ClassDetailDto | null> {
  await authorize(session, 'classes.view');
  const db = prismaAs(session);
  const row = await db.gymClass.findUnique({ where: { id } });
  if (!row) return null;
  const c = toClass(row);
  const date = today();
  const [[dto], roster, pkgs] = await Promise.all([
    toClassDtos(db, [c], session, now()),
    db.booking.findMany({ where: { classId: id, status: 'booked' }, include: { member: true }, orderBy: { createdAt: 'asc' } }),
    packagesById(db),
  ]);
  if (!dto) return null;
  return {
    ...dto,
    otherBooked: c.otherBooked,
    roster: roster.map(b => ({ bookingId: b.id, memberId: b.memberId, name: b.member.name, code: b.member.code, status: toMemberDto(toMember(b.member), pkgs, date).status })),
  };
}

/** จองคลาส: เจ้าหน้าที่จองให้สมาชิกคนใดก็ได้ สมาชิกจองได้เฉพาะให้ตัวเอง */
export async function bookClass(session: Session, classId: string, memberId: string): Promise<BookingDecision> {
  const self = can(session, 'portal.use') && session.memberId === memberId;
  if (!self) await authorize(session, 'classes.book');
  return transaction(session, async tx => {
    // ล็อกแถวคลาสไว้ระหว่างนับที่นั่ง — สองคนจองที่สุดท้ายพร้อมกันจะไม่เกินความจุ
    await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR UPDATE`;
    const [cRow, mRow, pkgs] = await Promise.all([tx.gymClass.findUnique({ where: { id: classId } }), tx.member.findUnique({ where: { id: memberId } }), packagesById(tx)]);
    if (!cRow || !mRow) throw new Error('NOT_FOUND');
    const c = toClass(cRow);
    const booked = (await bookedCounts(tx, [c])).get(c.id) ?? 0;
    const decision = decideBooking({
      startsAt: c.startsAt,
      capacity: c.capacity,
      booked,
      alreadyBooked: (await tx.booking.count({ where: { classId, memberId, status: 'booked' } })) > 0,
      memberStatus: toMemberDto(toMember(mRow), pkgs, today()).status,
      now: now(),
    });
    if (decision.ok) await tx.booking.create({ data: { classId, memberId, createdAt: now() } });
    return decision;
  });
}

export async function cancelBooking(session: Session, bookingId: string): Promise<CancelDecision & { classId?: string }> {
  const db = prismaAs(session);
  const b = await db.booking.findFirst({ where: { id: bookingId, status: 'booked' }, include: { class: true } });
  if (!b) throw new Error('NOT_FOUND');
  const self = can(session, 'portal.use') && session.memberId === b.memberId;
  if (!self) await authorize(session, 'classes.book');
  const startsAt = b.class.startsAt.toISOString();
  // เจ้าหน้าที่ยกเลิกให้ได้ทุกเวลาก่อนคลาสเริ่ม ส่วนสมาชิกต้องก่อนเวลาที่กำหนด
  const decision: CancelDecision = self ? decideCancel(startsAt, now()) : now() < b.class.startsAt ? { ok: true } : { ok: false, reason: 'too-late' };
  if (decision.ok) await db.booking.update({ where: { id: bookingId }, data: { status: 'cancelled' } });
  return { ...decision, classId: b.classId };
}

export interface ClassInput {
  title: string;
  trainerId: string;
  room: string;
  startsAt: string;
  minutes: number;
  capacity: number;
  level: ClassRecord['level'];
}

export async function createClass(session: Session, input: ClassInput): Promise<string> {
  await authorize(session, 'classes.manage');
  const db = prismaAs(session);
  if (!(await db.trainer.findUnique({ where: { id: input.trainerId } }))) throw new Error('TRAINER_NOT_FOUND');
  const row = await db.gymClass.create({ data: { ...input, startsAt: new Date(input.startsAt) } });
  return row.id;
}

export async function listRooms(session: Session): Promise<string[]> {
  await authorize(session, 'classes.view');
  const rows = await prismaAs(session).gymClass.findMany({ distinct: ['room'], select: { room: true } });
  return rows.map(r => r.room).sort();
}
