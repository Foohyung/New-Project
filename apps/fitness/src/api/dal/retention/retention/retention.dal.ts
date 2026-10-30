import 'server-only';
import { addDays, bangkokDate, daysBetween } from '@/api/lib/utils/utils/utils';
import { daysLeft as daysLeftOf, isFrozenOn } from '@/api/services/members/members/members.service';
import { riskScore, type FollowUpStage } from '@/api/services/retention/retention/retention.service';
import type { AtRiskDto, RetentionDto } from '@/api/types/retention/retention/retention.types';
import { monthStart } from '@/api/services/shared/shared/shared.date-range';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, bangkokStart, packagesById, prismaAs, toFollowUp, toMember, transaction, type MemberRecord, type PackageRecord } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import { createWinbackCoupon } from '@/api/dal/coupons/coupons/coupons.dal';

interface Signals {
  visits: string[];
  paymentFailed: boolean;
  ignoredReminders: number;
  stage: FollowUpStage | null;
}

function weeklyVisits(visits: string[], date: string): number[] {
  return Array.from({ length: 8 }, (_, i) => {
    const end = addDays(date, -7 * (7 - i));
    const start = addDays(end, -6);
    return visits.filter(v => v >= start && v <= end).length;
  });
}

function assess(m: MemberRecord, pkgs: Map<string, PackageRecord>, s: Signals, date: string): AtRiskDto {
  const weekly = weeklyVisits(s.visits, date);
  const last = [...s.visits].sort().at(-1);
  const left = daysLeftOf({ expiresOn: m.expiresOn, frozen: false }, date);
  const risk = riskScore({
    daysSinceLastVisit: last ? daysBetween(last, date) : null,
    recentVisits: weekly.slice(4).reduce((a, b) => a + b, 0),
    previousVisits: weekly.slice(0, 4).reduce((a, b) => a + b, 0),
    daysLeft: left,
    paymentFailed: s.paymentFailed,
    ignoredReminders: s.ignoredReminders,
  });
  return {
    memberId: m.id,
    name: m.name,
    code: m.code,
    phone: m.phone,
    packageName: pkgs.get(m.packageId)?.name ?? '',
    daysLeft: left,
    ...risk,
    weekly,
    stage: s.stage,
    canMessage: m.marketingConsent,
  };
}

export async function getRetention(session: Session): Promise<RetentionDto> {
  await authorize(session, 'retention.view');
  const db = prismaAs(session);
  const date = today();
  const month = monthStart(date);
  const pkgs = await packagesById(db);
  const timePackages = [...pkgs.values()].filter(p => p.kind === 'time').map(p => p.id);
  const [memberRows, checkIns, charges, reminders, followUps, renewals, lapsed] = await Promise.all([
    db.member.findMany({ where: { packageId: { in: timePackages } } }),
    // 8 สัปดาห์ย้อนหลัง + วันนี้
    db.checkIn.findMany({ where: { allowed: true, at: { gte: bangkokStart(addDays(date, -63)) } }, select: { memberId: true, at: true } }),
    db.charge.findMany({ where: { status: { not: 'paid' } }, select: { memberId: true } }),
    db.reminderLog.findMany({ where: { clicked: false, sentAt: { gte: bangkokStart(addDays(date, -14)) } }, select: { memberId: true } }),
    db.followUp.findMany({ include: { member: { select: { name: true } } } }),
    db.payment.count({ where: { kind: 'renew', status: 'paid', paidAt: bangkokSpan(month, date) } }),
    // หมดอายุในเดือนนี้แล้วยังไม่ต่อ
    db.member.count({ where: { packageId: { in: timePackages }, expiresOn: { gte: asDay(month), lt: asDay(date) } } }),
  ]);
  const visitsOf = new Map<string, string[]>();
  for (const c of checkIns) visitsOf.set(c.memberId, [...(visitsOf.get(c.memberId) ?? []), bangkokDate(c.at)]);
  const failing = new Set(charges.map(c => c.memberId));
  const stageOf = new Map(followUps.map(f => [f.memberId, f.stage]));
  // คิดเฉพาะสมาชิกแบบรายเดือน/รายปีที่ไม่ได้พักอยู่ (Day pass และ PT ไม่มีการต่ออายุ)
  const scored = memberRows
    .map(toMember)
    .filter(m => !isFrozenOn(m.freeze, date))
    .map(m => assess(m, pkgs, { visits: visitsOf.get(m.id) ?? [], paymentFailed: failing.has(m.id), ignoredReminders: reminders.filter(r => r.memberId === m.id).length, stage: stageOf.get(m.id) ?? null }, date))
    .sort((a, b) => b.score - a.score);
  const atRisk = scored.filter(r => r.level !== 'low');
  const won = followUps.filter(f => f.stage === 'won' && bangkokDate(f.updatedAt).slice(0, 7) === date.slice(0, 7));
  const wonPayments = won.length
    ? await db.payment.findMany({ where: { memberId: { in: won.map(f => f.memberId) }, status: 'paid' }, orderBy: { paidAt: 'asc' }, select: { memberId: true, paidAt: true, amountSatang: true } })
    : [];
  const board: RetentionDto['board'] = { todo: [], contacted: [], won: [] };
  for (const r of atRisk.filter(x => x.level === 'high' && (x.stage === null || x.stage === 'todo'))) board.todo.push({ memberId: r.memberId, name: r.name, note: r.reasons.map(x => x.label).join(' · '), by: '', updatedAt: '' });
  for (const f of followUps.filter(x => x.stage !== 'todo')) board[f.stage].push({ ...toFollowUp(f), name: f.member.name });
  return {
    renewalRatePct: renewals + lapsed ? Math.round((renewals / (renewals + lapsed)) * 100) : 0,
    high: atRisk.filter(r => r.level === 'high').length,
    medium: atRisk.filter(r => r.level === 'medium').length,
    recovered: won.length,
    recoveredSatang: won.reduce((sum, f) => {
      const since = addDays(bangkokDate(f.updatedAt), -1);
      return sum + (wonPayments.filter(p => p.memberId === f.memberId && p.paidAt && bangkokDate(p.paidAt) >= since).at(-1)?.amountSatang ?? 0);
    }, 0),
    atRisk,
    board,
  };
}

export async function recordFollowUp(session: Session, memberId: string, stage: FollowUpStage, note: string): Promise<void> {
  await authorize(session, 'retention.view');
  const db = prismaAs(session);
  if (!(await db.member.findUnique({ where: { id: memberId } }))) throw new Error('NOT_FOUND');
  const entry = { stage, note, by: session.name, updatedAt: now() };
  await db.followUp.upsert({ where: { memberId }, create: { memberId, ...entry }, update: entry });
}

/** ให้คูปองดึงกลับเฉพาะคน (ลด 15% ใช้ครั้งเดียว) แล้วบันทึกว่าติดต่อแล้ว */
export async function giveWinbackCoupon(session: Session, memberId: string): Promise<string> {
  await authorize(session, 'retention.view');
  const code = await transaction(session, async tx => {
    const m = await tx.member.findUnique({ where: { id: memberId } });
    if (!m) throw new Error('NOT_FOUND');
    return (await createWinbackCoupon(tx, m.id, m.code)).code;
  });
  await recordFollowUp(session, memberId, 'contacted', `ให้คูปอง ${code} ลด 15%`);
  return code;
}
