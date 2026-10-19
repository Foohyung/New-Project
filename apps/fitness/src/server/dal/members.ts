import 'server-only';
import { addDays, bangkokDate, normalizePhone } from '@repo/utils';
import { daysLeft, isFrozenOn, memberCode, membershipStatus, planFreeze, planUnfreeze, type FreezeDecision, type MembershipStatus } from '@/features/members/service';
import type { MemberDetailDto, MemberDto } from '@/features/members/types';
import type { PaymentMethod } from '@/features/payments/service';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type MemberRecord, type Store } from '../db';
import { authorize, can } from '../rbac';
import { createPaymentRecord, toPaymentDto } from './payments';

export type { MemberDto };

export function toMemberDto(store: Store, m: MemberRecord, date: string): MemberDto {
  const frozen = isFrozenOn(m.freeze, date);
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    phone: m.phone,
    packageId: m.packageId,
    packageName: store.packages.find(p => p.id === m.packageId)?.name ?? m.packageId,
    expiresOn: m.expiresOn,
    daysLeft: daysLeft({ expiresOn: m.expiresOn, frozen }, date),
    status: membershipStatus({ expiresOn: m.expiresOn, frozen }, date),
    lastCheckInAt: m.lastCheckInAt,
    ptSessionsLeft: m.ptSessionsLeft,
  };
}

export async function listMembers(session: Session, filter: { status?: MembershipStatus; q?: string } = {}): Promise<MemberDto[]> {
  await authorize(session, 'members.view');
  const store = db();
  const date = today();
  const q = filter.q?.trim().toLowerCase();
  const digits = q ? normalizePhone(q) : '';
  return store.members
    .map(m => toMemberDto(store, m, date))
    .filter(m => !filter.status || m.status === filter.status)
    .filter(m => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (digits.length >= 3 && m.phone.includes(digits)))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export async function countByStatus(session: Session): Promise<Record<MembershipStatus | 'all', number>> {
  const all = await listMembers(session);
  const counts = { all: all.length, active: 0, expiring: 0, expired: 0, frozen: 0 };
  for (const m of all) counts[m.status]++;
  return counts;
}

function findByQuery(store: Store, query: string): MemberRecord | undefined {
  const phone = normalizePhone(query);
  const code = query.trim().toUpperCase();
  return store.members.find(m => m.phone === phone || m.code === code);
}

/** หาสมาชิกจากเบอร์โทรหรือรหัสสมาชิกแบบตรงตัว (ใช้ตอนจองคลาส/PT ให้สมาชิก) */
export async function findMember(session: Session, query: string): Promise<MemberDto | undefined> {
  await authorize(session, 'members.view');
  const store = db();
  const found = findByQuery(store, query);
  return found && toMemberDto(store, found, today());
}

export async function getMemberDetail(session: Session, id: string): Promise<MemberDetailDto | null> {
  await authorize(session, 'members.view');
  const store = db();
  const m = store.members.find(x => x.id === id);
  if (!m) return null;
  const date = today();
  const instant = now().toISOString();
  const payments = store.payments.filter(p => p.memberId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    ...toMemberDto(store, m, date),
    email: m.email,
    joinedOn: m.joinedOn,
    note: m.note,
    freeze: m.freeze && m.freeze.until >= date ? m.freeze : null,
    checkIns: store.checkIns.filter(c => c.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10).map(c => ({ at: c.at, allowed: c.allowed })),
    bookings: store.bookings
      .filter(b => b.memberId === m.id && b.status === 'booked')
      .flatMap(b => {
        const c = store.classes.find(x => x.id === b.classId);
        return c && c.startsAt >= instant ? [{ id: b.id, classId: c.id, title: c.title, startsAt: c.startsAt, room: c.room }] : [];
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    ptSessions: store.ptSessions
      .filter(s => s.memberId === m.id)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .slice(0, 6)
      .map(s => ({ id: s.id, trainerName: store.trainers.find(t => t.id === s.trainerId)?.nickname ?? '—', startsAt: s.startsAt, status: s.status })),
    payments: can(session, 'payments.view') ? payments.map(p => toPaymentDto(store, p)) : null,
    pendingPaymentId: payments.find(p => p.status !== 'paid')?.id ?? null,
  };
}

/** เช็กอินที่เคาน์เตอร์ */
export async function findMemberForCheckIn(session: Session, query: string): Promise<(MemberDto & { frozen: boolean }) | undefined> {
  await authorize(session, 'checkin.use');
  const store = db();
  const found = findByQuery(store, query);
  const date = today();
  return found && { ...toMemberDto(store, found, date), frozen: isFrozenOn(found.freeze, date) };
}

export async function recordCheckIn(session: Session, memberId: string, allowed: boolean, at: Date): Promise<void> {
  await authorize(session, 'checkin.use');
  const store = db();
  store.checkIns.push({ id: nextId('ci'), memberId, at: at.toISOString(), allowed });
  const member = store.members.find(m => m.id === memberId);
  if (member && allowed) member.lastCheckInAt = at.toISOString();
}

export interface CheckInFeedItem {
  memberId: string;
  name: string;
  packageName: string;
  at: string;
  allowed: boolean;
  status: MembershipStatus;
  expiresOn: string;
}

export async function recentCheckIns(session: Session, limit = 6): Promise<CheckInFeedItem[]> {
  await authorize(session, 'members.view');
  const store = db();
  const date = today();
  return [...store.checkIns]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .flatMap(c => {
      const m = store.members.find(x => x.id === c.memberId);
      if (!m) return [];
      const dto = toMemberDto(store, m, date);
      return [{ memberId: m.id, name: m.name, packageName: dto.packageName, at: c.at, allowed: c.allowed, status: dto.status, expiresOn: m.expiresOn }];
    });
}

export async function checkInsToday(session: Session): Promise<number> {
  await authorize(session, 'members.view');
  const date = today();
  // นับเฉพาะรายการที่เกิดหลังข้อมูลตั้งต้น (ข้อมูลตั้งต้นรวมอยู่ในยอดสรุปแล้ว)
  return db().checkIns.filter(c => c.allowed && c.id.startsWith('ci-') && bangkokDate(new Date(c.at)) === date).length;
}

export class PhoneTakenError extends Error {
  constructor() {
    super('PHONE_TAKEN');
  }
}

export interface MemberInput {
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
}

export async function createMember(session: Session, input: MemberInput & { packageId: string; method: PaymentMethod }): Promise<{ memberId: string; paymentId: string; paid: boolean }> {
  await authorize(session, 'members.manage');
  await authorize(session, 'payments.collect');
  const store = db();
  if (store.members.some(m => m.phone === input.phone)) throw new PhoneTakenError();
  store.sequence.member += 1;
  const member: MemberRecord = {
    id: nextId('m'),
    code: memberCode(store.sequence.member),
    name: input.name,
    phone: input.phone,
    email: input.email,
    joinedOn: today(),
    packageId: input.packageId,
    // ยังไม่ได้ชำระ = ยังไม่มีสิทธิ์ (วันหมดอายุเป็นเมื่อวาน) จนกว่าการชำระจะยืนยัน
    expiresOn: addDays(today(), -1),
    freeze: null,
    ptSessionsLeft: 0,
    lastCheckInAt: null,
    note: input.note,
  };
  store.members.push(member);
  const pkg = store.packages.find(p => p.id === input.packageId);
  const kind = pkg?.kind === 'daypass' ? 'daypass' : pkg?.kind === 'pt' ? 'pt' : 'signup';
  const payment = createPaymentRecord(store, { memberId: member.id, packageId: input.packageId, kind, method: input.method });
  return { memberId: member.id, paymentId: payment.id, paid: payment.status === 'paid' };
}

export async function updateMember(session: Session, id: string, input: MemberInput): Promise<void> {
  await authorize(session, 'members.manage');
  const store = db();
  const m = store.members.find(x => x.id === id);
  if (!m) throw new Error('NOT_FOUND');
  if (store.members.some(x => x.id !== id && x.phone === input.phone)) throw new PhoneTakenError();
  Object.assign(m, input);
}

export async function renewMember(session: Session, id: string, packageId: string, method: PaymentMethod): Promise<{ paymentId: string; paid: boolean }> {
  await authorize(session, 'members.manage');
  await authorize(session, 'payments.collect');
  const store = db();
  const m = store.members.find(x => x.id === id);
  const pkg = store.packages.find(p => p.id === packageId && p.active);
  if (!m || !pkg) throw new Error('NOT_FOUND');
  const kind = pkg.kind === 'pt' ? 'pt' : pkg.kind === 'daypass' ? 'daypass' : 'renew';
  const payment = createPaymentRecord(store, { memberId: m.id, packageId: pkg.id, kind, method });
  return { paymentId: payment.id, paid: payment.status === 'paid' };
}

export async function freezeMember(session: Session, id: string, days: number): Promise<FreezeDecision> {
  await authorize(session, 'members.manage');
  const m = db().members.find(x => x.id === id);
  if (!m) throw new Error('NOT_FOUND');
  const decision = planFreeze(m, today(), days);
  if (decision.ok) {
    m.freeze = decision.freeze;
    m.expiresOn = decision.expiresOn;
  }
  return decision;
}

export async function unfreezeMember(session: Session, id: string): Promise<void> {
  await authorize(session, 'members.manage');
  const m = db().members.find(x => x.id === id);
  if (!m?.freeze) throw new Error('NOT_FOUND');
  m.expiresOn = planUnfreeze({ expiresOn: m.expiresOn, freeze: m.freeze }, today()).expiresOn;
  m.freeze = null;
}
