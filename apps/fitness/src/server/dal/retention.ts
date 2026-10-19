import 'server-only';
import { addDays, bangkokDate, daysBetween } from '@repo/utils';
import { daysLeft as daysLeftOf, isFrozenOn } from '@/features/members/service';
import { riskScore, type FollowUpStage } from '@/features/retention/service';
import type { AtRiskDto, RetentionDto } from '@/features/retention/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { BASELINE, db, type MemberRecord, type Store } from '../db';
import { authorize } from '../rbac';
import { createWinbackCoupon } from './coupons';

function weeklyVisits(store: Store, memberId: string, date: string): number[] {
  const visits = store.checkIns.filter(c => c.memberId === memberId && c.allowed).map(c => bangkokDate(new Date(c.at)));
  return Array.from({ length: 8 }, (_, i) => {
    const end = addDays(date, -7 * (7 - i));
    const start = addDays(end, -6);
    return visits.filter(v => v >= start && v <= end).length;
  });
}

function assess(store: Store, m: MemberRecord, date: string): AtRiskDto {
  const weekly = weeklyVisits(store, m.id, date);
  const last = store.checkIns.filter(c => c.memberId === m.id && c.allowed).map(c => bangkokDate(new Date(c.at))).sort().at(-1);
  const left = daysLeftOf({ expiresOn: m.expiresOn, frozen: false }, date);
  const paymentFailed = store.charges.some(c => c.memberId === m.id && c.status !== 'paid');
  const ignoredReminders = store.reminderLogs.filter(l => l.memberId === m.id && !l.clicked && daysBetween(l.sentAt.slice(0, 10), date) <= 14).length;
  const risk = riskScore({
    daysSinceLastVisit: last ? daysBetween(last, date) : null,
    recentVisits: weekly.slice(4).reduce((a, b) => a + b, 0),
    previousVisits: weekly.slice(0, 4).reduce((a, b) => a + b, 0),
    daysLeft: left,
    paymentFailed,
    ignoredReminders,
  });
  return {
    memberId: m.id,
    name: m.name,
    code: m.code,
    phone: m.phone,
    packageName: store.packages.find(p => p.id === m.packageId)?.name ?? '',
    daysLeft: left,
    ...risk,
    weekly,
    stage: store.followUps.find(f => f.memberId === m.id)?.stage ?? null,
    canMessage: m.marketingConsent,
  };
}

export async function getRetention(session: Session): Promise<RetentionDto> {
  await authorize(session, 'retention.view');
  const store = db();
  const date = today();
  // คิดเฉพาะสมาชิกแบบรายเดือน/รายปีที่ไม่ได้พักอยู่ (Day pass และ PT ไม่มีการต่ออายุ)
  const scored = store.members
    .filter(m => store.packages.find(p => p.id === m.packageId)?.kind === 'time' && !isFrozenOn(m.freeze, date))
    .map(m => assess(store, m, date))
    .sort((a, b) => b.score - a.score);
  const atRisk = scored.filter(r => r.level !== 'low');
  const name = (id: string) => store.members.find(m => m.id === id)?.name ?? '—';
  const won = store.followUps.filter(f => f.stage === 'won' && f.updatedAt.slice(0, 7) === date.slice(0, 7));
  const board: RetentionDto['board'] = { todo: [], contacted: [], won: [] };
  for (const r of atRisk.filter(x => x.level === 'high' && (x.stage === null || x.stage === 'todo'))) board.todo.push({ memberId: r.memberId, name: r.name, note: r.reasons.map(x => x.label).join(' · '), by: '', updatedAt: '' });
  for (const f of store.followUps.filter(x => x.stage !== 'todo')) board[f.stage].push({ memberId: f.memberId, name: name(f.memberId), note: f.note, by: f.by, updatedAt: f.updatedAt });
  return {
    renewalRatePct: Math.round((BASELINE.renewalsThisMonth / (BASELINE.renewalsThisMonth + BASELINE.lapsedThisMonth)) * 100),
    high: atRisk.filter(r => r.level === 'high').length,
    medium: atRisk.filter(r => r.level === 'medium').length,
    recovered: won.length,
    recoveredSatang: won.reduce((sum, f) => sum + (store.payments.filter(p => p.memberId === f.memberId && p.status === 'paid' && (p.paidAt ?? '') >= addDays(f.updatedAt.slice(0, 10), -1)).at(-1)?.amountSatang ?? 0), 0),
    atRisk,
    board,
  };
}

export async function recordFollowUp(session: Session, memberId: string, stage: FollowUpStage, note: string): Promise<void> {
  await authorize(session, 'retention.view');
  const store = db();
  if (!store.members.some(m => m.id === memberId)) throw new Error('NOT_FOUND');
  const entry = { memberId, stage, note, by: session.name, updatedAt: now().toISOString() };
  const existing = store.followUps.find(f => f.memberId === memberId);
  if (existing) Object.assign(existing, entry);
  else store.followUps.push(entry);
}

/** ให้คูปองดึงกลับเฉพาะคน (ลด 15% ใช้ครั้งเดียว) แล้วบันทึกว่าติดต่อแล้ว */
export async function giveWinbackCoupon(session: Session, memberId: string): Promise<string> {
  await authorize(session, 'retention.view');
  const store = db();
  const m = store.members.find(x => x.id === memberId);
  if (!m) throw new Error('NOT_FOUND');
  const coupon = createWinbackCoupon(store, m.id, m.code);
  await recordFollowUp(session, memberId, 'contacted', `ให้คูปอง ${coupon.code} ลด 15%`);
  return coupon.code;
}
