import 'server-only';
import { addDays } from '@/api/lib/utils/utils/utils';
import { decidePtBooking, PT_MINUTES, type PtDecision } from '@/api/services/trainers/trainers/trainers.service';
import type { TrainerDetailDto, TrainerDto } from '@/api/types/trainers/trainers/trainers.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { bangkokSpan, prismaAs, toPtSession, toTrainer, transaction, type TrainerRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';

/** สัปดาห์นี้ = วันนี้ถึงอีก 6 วัน (ตามเวลาไทย) */
const thisWeek = () => bangkokSpan(today(), addDays(today(), 6));

async function toTrainerDtos(db: Tx, trainers: TrainerRecord[]): Promise<TrainerDto[]> {
  const ids = trainers.map(t => t.id);
  const [classes, pt] = await Promise.all([
    db.gymClass.groupBy({ by: ['trainerId'], where: { trainerId: { in: ids }, startsAt: thisWeek() }, _count: true }),
    db.ptSession.groupBy({ by: ['trainerId'], where: { trainerId: { in: ids }, status: 'booked', startsAt: { gte: now() } }, _count: true }),
  ]);
  const count = (rows: { trainerId: string; _count: number }[], id: string) => rows.find(r => r.trainerId === id)?._count ?? 0;
  return trainers.map(t => ({ ...t, classesThisWeek: count(classes, t.id), ptUpcoming: count(pt, t.id) }));
}

/** เทรนเนอร์แก้ได้เฉพาะคิวของตัวเอง ส่วนเคาน์เตอร์/ผู้จัดการแก้ได้ทุกคน */
function canManageTrainer(session: Session, trainerId: string): boolean {
  if (!can(session, 'pt.manage')) return false;
  return !session.trainerId || session.trainerId === trainerId;
}

export async function listTrainers(session: Session): Promise<TrainerDto[]> {
  await authorize(session, 'trainers.view');
  const db = prismaAs(session);
  const rows = await db.trainer.findMany({ orderBy: { createdAt: 'asc' } });
  return toTrainerDtos(db, rows.map(toTrainer));
}

export async function getTrainerDetail(session: Session, id: string): Promise<TrainerDetailDto | null> {
  await authorize(session, 'trainers.view');
  const db = prismaAs(session);
  const row = await db.trainer.findUnique({ where: { id } });
  if (!row) return null;
  const [[dto], sessions, classes] = await Promise.all([
    toTrainerDtos(db, [toTrainer(row)]),
    db.ptSession.findMany({ where: { trainerId: id, status: { not: 'cancelled' }, startsAt: bangkokSpan(addDays(today(), -3), addDays(today(), 6)) }, include: { member: { select: { name: true, code: true } } }, orderBy: { startsAt: 'asc' } }),
    db.gymClass.findMany({ where: { trainerId: id, startsAt: thisWeek() }, include: { _count: { select: { bookings: { where: { status: 'booked' } } } } }, orderBy: { startsAt: 'asc' } }),
  ]);
  if (!dto) return null;
  return {
    ...dto,
    canManage: canManageTrainer(session, id),
    sessions: sessions.map(s => ({ id: s.id, memberId: s.memberId, memberName: s.member.name, memberCode: s.member.code, startsAt: s.startsAt.toISOString(), minutes: s.minutes, status: s.status })),
    classes: classes.map(c => ({ id: c.id, title: c.title, startsAt: c.startsAt.toISOString(), minutes: c.minutes, room: c.room, capacity: c.capacity, booked: c.otherBooked + c._count.bookings })),
  };
}

export async function bookPt(session: Session, trainerId: string, memberId: string, startsAt: string): Promise<PtDecision> {
  await authorize(session, 'pt.manage');
  if (!canManageTrainer(session, trainerId)) throw new ForbiddenError();
  return transaction(session, async tx => {
    const [m, trainer] = await Promise.all([tx.member.findUnique({ where: { id: memberId } }), tx.trainer.findUnique({ where: { id: trainerId } })]);
    if (!m || !trainer) throw new Error('NOT_FOUND');
    const instant = now();
    const [trainerSessions, memberUpcoming] = await Promise.all([
      tx.ptSession.findMany({ where: { trainerId } }),
      tx.ptSession.count({ where: { memberId, status: 'booked', startsAt: { gte: instant } } }),
    ]);
    const decision = decidePtBooking({ startsAt, minutes: PT_MINUTES, now: instant, trainerSessions: trainerSessions.map(toPtSession), sessionsLeft: m.ptSessionsLeft, memberUpcoming });
    if (decision.ok) await tx.ptSession.create({ data: { trainerId, memberId, startsAt: new Date(startsAt), minutes: PT_MINUTES } });
    return decision;
  });
}

async function bookedSession(session: Session, sessionId: string) {
  const s = await prismaAs(session).ptSession.findFirst({ where: { id: sessionId, status: 'booked' } });
  if (!s) throw new Error('NOT_FOUND');
  if (!canManageTrainer(session, s.trainerId)) throw new ForbiddenError();
  return s;
}

/** เทรนเสร็จแล้ว → หักครั้ง PT ของสมาชิก */
export async function completePt(session: Session, sessionId: string): Promise<void> {
  const s = await bookedSession(session, sessionId);
  await transaction(session, async tx => {
    await tx.ptSession.update({ where: { id: s.id }, data: { status: 'done' } });
    await tx.member.updateMany({ where: { id: s.memberId, ptSessionsLeft: { gt: 0 } }, data: { ptSessionsLeft: { decrement: 1 } } });
  });
}

export async function cancelPt(session: Session, sessionId: string): Promise<void> {
  const s = await bookedSession(session, sessionId);
  await prismaAs(session).ptSession.update({ where: { id: s.id }, data: { status: 'cancelled' } });
}
