import 'server-only';
import { addDays, bangkokDate } from '@repo/utils';
import { decidePtBooking, PT_MINUTES, type PtDecision } from '@/features/trainers/service';
import type { TrainerDetailDto, TrainerDto } from '@/features/trainers/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type Store, type TrainerRecord } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';

function weekRange(): { from: string; until: string } {
  const from = today();
  return { from, until: addDays(from, 7) };
}

const inRange = (instant: string, r: { from: string; until: string }) => {
  const d = bangkokDate(new Date(instant));
  return d >= r.from && d < r.until;
};

function toTrainerDto(store: Store, t: TrainerRecord): TrainerDto {
  const range = weekRange();
  const instant = now().toISOString();
  return {
    id: t.id,
    name: t.name,
    nickname: t.nickname,
    specialties: t.specialties,
    bio: t.bio,
    color: t.color,
    classesThisWeek: store.classes.filter(c => c.trainerId === t.id && inRange(c.startsAt, range)).length,
    ptUpcoming: store.ptSessions.filter(s => s.trainerId === t.id && s.status === 'booked' && s.startsAt >= instant).length,
  };
}

/** เทรนเนอร์แก้ได้เฉพาะคิวของตัวเอง ส่วนเคาน์เตอร์/ผู้จัดการแก้ได้ทุกคน */
function canManageTrainer(session: Session, trainerId: string): boolean {
  if (!can(session, 'pt.manage')) return false;
  return session.role !== 'trainer' || session.trainerId === trainerId;
}

export async function listTrainers(session: Session): Promise<TrainerDto[]> {
  await authorize(session, 'trainers.view');
  const store = db();
  return store.trainers.map(t => toTrainerDto(store, t));
}

export async function getTrainerDetail(session: Session, id: string): Promise<TrainerDetailDto | null> {
  await authorize(session, 'trainers.view');
  const store = db();
  const t = store.trainers.find(x => x.id === id);
  if (!t) return null;
  const range = { from: addDays(today(), -3), until: addDays(today(), 7) };
  return {
    ...toTrainerDto(store, t),
    canManage: canManageTrainer(session, t.id),
    sessions: store.ptSessions
      .filter(s => s.trainerId === t.id && s.status !== 'cancelled' && inRange(s.startsAt, range))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(s => {
        const m = store.members.find(x => x.id === s.memberId);
        return { id: s.id, memberId: s.memberId, memberName: m?.name ?? '—', memberCode: m?.code ?? '—', startsAt: s.startsAt, minutes: s.minutes, status: s.status };
      }),
    classes: store.classes
      .filter(c => c.trainerId === t.id && inRange(c.startsAt, weekRange()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(c => ({ id: c.id, title: c.title, startsAt: c.startsAt, minutes: c.minutes, room: c.room, capacity: c.capacity, booked: c.otherBooked + store.bookings.filter(b => b.classId === c.id && b.status === 'booked').length })),
  };
}

export async function bookPt(session: Session, trainerId: string, memberId: string, startsAt: string): Promise<PtDecision> {
  await authorize(session, 'pt.manage');
  if (!canManageTrainer(session, trainerId)) throw new ForbiddenError();
  const store = db();
  const m = store.members.find(x => x.id === memberId);
  if (!m || !store.trainers.some(t => t.id === trainerId)) throw new Error('NOT_FOUND');
  const instant = now();
  const decision = decidePtBooking({
    startsAt,
    minutes: PT_MINUTES,
    now: instant,
    trainerSessions: store.ptSessions.filter(s => s.trainerId === trainerId),
    sessionsLeft: m.ptSessionsLeft,
    memberUpcoming: store.ptSessions.filter(s => s.memberId === m.id && s.status === 'booked' && s.startsAt >= instant.toISOString()).length,
  });
  if (decision.ok) store.ptSessions.push({ id: nextId('pt'), trainerId, memberId: m.id, startsAt, minutes: PT_MINUTES, status: 'booked' });
  return decision;
}

/** เทรนเสร็จแล้ว → หักครั้ง PT ของสมาชิก */
export function completePt(session: Session, sessionId: string): Promise<void> {
  const store = db();
  const s = store.ptSessions.find(x => x.id === sessionId && x.status === 'booked');
  if (!s) return Promise.reject(new Error('NOT_FOUND'));
  if (!canManageTrainer(session, s.trainerId)) return Promise.reject(new ForbiddenError());
  const m = store.members.find(x => x.id === s.memberId);
  s.status = 'done';
  if (m) m.ptSessionsLeft = Math.max(0, m.ptSessionsLeft - 1);
  return Promise.resolve();
}

export function cancelPt(session: Session, sessionId: string): Promise<void> {
  const store = db();
  const s = store.ptSessions.find(x => x.id === sessionId && x.status === 'booked');
  if (!s) return Promise.reject(new Error('NOT_FOUND'));
  if (!canManageTrainer(session, s.trainerId)) return Promise.reject(new ForbiddenError());
  s.status = 'cancelled';
  return Promise.resolve();
}
