import 'server-only';
import { addDays, bangkokDate } from '@repo/utils';
import { classState, decideBooking, decideCancel, type BookingDecision, type CancelDecision } from '@/features/classes/service';
import type { ClassDetailDto, ClassDto } from '@/features/classes/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type ClassRecord, type Store } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';
import { toMemberDto } from './members';

function bookedCount(store: Store, classId: string, otherBooked: number): number {
  return otherBooked + store.bookings.filter(b => b.classId === classId && b.status === 'booked').length;
}

function toClassDto(store: Store, c: ClassRecord, session: Session, instant: Date): ClassDto {
  const mine = session.memberId ? store.bookings.find(b => b.classId === c.id && b.memberId === session.memberId && b.status === 'booked') : undefined;
  return {
    id: c.id,
    title: c.title,
    trainerId: c.trainerId,
    trainerName: store.trainers.find(t => t.id === c.trainerId)?.nickname ?? '—',
    room: c.room,
    startsAt: c.startsAt,
    minutes: c.minutes,
    capacity: c.capacity,
    booked: bookedCount(store, c.id, c.otherBooked),
    level: c.level,
    state: classState(c.startsAt, c.minutes, instant),
    myBookingId: mine?.id ?? null,
  };
}

function canViewSchedule(session: Session): Promise<void> {
  return can(session, 'classes.view') || can(session, 'portal.use') ? Promise.resolve() : Promise.reject(new ForbiddenError());
}

/** ตารางคลาสตั้งแต่วันที่ `from` จำนวน `days` วัน เรียงตามเวลาเริ่ม */
export async function listClasses(session: Session, from: string, days = 7): Promise<ClassDto[]> {
  await canViewSchedule(session);
  const store = db();
  const instant = now();
  const until = addDays(from, days);
  return store.classes
    .filter(c => {
      const date = bangkokDate(new Date(c.startsAt));
      return date >= from && date < until;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(c => toClassDto(store, c, session, instant));
}

export async function getClassDetail(session: Session, id: string): Promise<ClassDetailDto | null> {
  await authorize(session, 'classes.view');
  const store = db();
  const c = store.classes.find(x => x.id === id);
  if (!c) return null;
  const date = today();
  return {
    ...toClassDto(store, c, session, now()),
    otherBooked: c.otherBooked,
    roster: store.bookings
      .filter(b => b.classId === c.id && b.status === 'booked')
      .flatMap(b => {
        const m = store.members.find(x => x.id === b.memberId);
        return m ? [{ bookingId: b.id, memberId: m.id, name: m.name, code: m.code, status: toMemberDto(store, m, date).status }] : [];
      }),
  };
}

/** จองคลาส: เจ้าหน้าที่จองให้สมาชิกคนใดก็ได้ สมาชิกจองได้เฉพาะให้ตัวเอง */
export async function bookClass(session: Session, classId: string, memberId: string): Promise<BookingDecision> {
  const self = can(session, 'portal.use') && session.memberId === memberId;
  if (!self) await authorize(session, 'classes.book');
  const store = db();
  const c = store.classes.find(x => x.id === classId);
  const m = store.members.find(x => x.id === memberId);
  if (!c || !m) throw new Error('NOT_FOUND');
  const decision = decideBooking({
    startsAt: c.startsAt,
    capacity: c.capacity,
    booked: bookedCount(store, c.id, c.otherBooked),
    alreadyBooked: store.bookings.some(b => b.classId === c.id && b.memberId === m.id && b.status === 'booked'),
    memberStatus: toMemberDto(store, m, today()).status,
    now: now(),
  });
  if (decision.ok) store.bookings.push({ id: nextId('b'), classId: c.id, memberId: m.id, createdAt: now().toISOString(), status: 'booked' });
  return decision;
}

export async function cancelBooking(session: Session, bookingId: string): Promise<CancelDecision & { classId?: string }> {
  const store = db();
  const b = store.bookings.find(x => x.id === bookingId && x.status === 'booked');
  if (!b) throw new Error('NOT_FOUND');
  const self = can(session, 'portal.use') && session.memberId === b.memberId;
  if (!self) await authorize(session, 'classes.book');
  const c = store.classes.find(x => x.id === b.classId);
  if (!c) throw new Error('NOT_FOUND');
  // เจ้าหน้าที่ยกเลิกให้ได้ทุกเวลาก่อนคลาสเริ่ม ส่วนสมาชิกต้องก่อนเวลาที่กำหนด
  const decision: CancelDecision = self ? decideCancel(c.startsAt, now()) : now() < new Date(c.startsAt) ? { ok: true } : { ok: false, reason: 'too-late' };
  if (decision.ok) b.status = 'cancelled';
  return { ...decision, classId: c.id };
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
  const store = db();
  if (!store.trainers.some(t => t.id === input.trainerId)) throw new Error('TRAINER_NOT_FOUND');
  const id = nextId('cls');
  store.classes.push({ id, ...input, otherBooked: 0 });
  return id;
}

export async function listRooms(session: Session): Promise<string[]> {
  await authorize(session, 'classes.view');
  return [...new Set(db().classes.map(c => c.room))].sort();
}
