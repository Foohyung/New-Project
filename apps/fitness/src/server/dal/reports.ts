import 'server-only';
import { addDays, bangkokDate } from '@repo/utils';
import { average, mergeDaily, sumRange, type DailyValue } from '@/features/reports/service';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { BASELINE, db } from '../db';
import { authorize } from '../rbac';

/** สัดส่วนยอดขายตามแพ็กเกจของยอดสรุปตั้งต้น */
const PACKAGE_SHARE: Record<string, number> = { monthly: 0.46, gold12: 0.24, '6m': 0.12, '3m': 0.06, pt10: 0.09, daypass: 0.03 };

export interface ReportDto {
  monthLabelFrom: string;
  to: string;
  revenue: { monthSatang: number; changePct: number; daily: DailyValue[]; avgDailySatang: number; pendingSatang: number };
  byPackage: { id: string; name: string; satang: number }[];
  checkIns: { daily: DailyValue[]; avg: number; today: number };
  members: { active: number; newThisMonth: number; renewals: number; lapsed: number };
  classes: { avgFillPct: number; top: { id: string; title: string; startsAt: string; booked: number; capacity: number }[]; ptThisWeek: number };
}

export async function getReport(session: Session): Promise<ReportDto> {
  await authorize(session, 'reports.view');
  const store = db();
  const to = today();
  const monthStart = `${to.slice(0, 8)}01`;
  const live = store.payments.filter(p => !p.seeded && p.status === 'paid' && p.paidAt);
  const liveDaily = live.map(p => ({ date: bangkokDate(new Date(p.paidAt ?? p.createdAt)), value: p.amountSatang }));
  const revenueDaily = mergeDaily(BASELINE.dailyRevenue.map(d => ({ date: d.date, value: d.satang })), liveDaily);
  const monthSatang = sumRange(revenueDaily, monthStart, to);

  const byPackage = store.packages
    .map(p => ({
      id: p.id,
      name: p.name,
      satang: Math.round((BASELINE.revenueMonthSatang * (PACKAGE_SHARE[p.id] ?? 0)) / 100) * 100 + live.filter(x => x.packageId === p.id).reduce((s, x) => s + x.amountSatang, 0),
    }))
    .sort((a, b) => b.satang - a.satang);

  const liveCheckIns = store.checkIns.filter(c => c.id.startsWith('ci-') && c.allowed).map(c => ({ date: bangkokDate(new Date(c.at)), value: 1 }));
  const checkInsDaily = mergeDaily(BASELINE.dailyCheckIns.map(d => ({ date: d.date, value: d.count })), liveCheckIns);

  const weekEnd = addDays(to, 7);
  const instant = now().toISOString();
  const week = store.classes
    .filter(c => {
      const d = bangkokDate(new Date(c.startsAt));
      return d >= to && d < weekEnd;
    })
    .map(c => ({ id: c.id, title: c.title, startsAt: c.startsAt, capacity: c.capacity, booked: c.otherBooked + store.bookings.filter(b => b.classId === c.id && b.status === 'booked').length }));

  const newMembers = store.members.filter(m => m.joinedOn >= monthStart && !/^\d+$/.test(m.id)).length;
  const liveRenewals = live.filter(p => p.kind === 'renew').length;

  return {
    monthLabelFrom: monthStart,
    to,
    revenue: {
      monthSatang,
      changePct: BASELINE.revenueChangePct,
      daily: revenueDaily,
      avgDailySatang: Math.round(monthSatang / (Number(to.slice(8)) || 1)),
      pendingSatang: store.payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amountSatang, 0),
    },
    byPackage,
    checkIns: { daily: checkInsDaily, avg: Math.round(average(checkInsDaily.map(d => d.value))), today: checkInsDaily.find(d => d.date === to)?.value ?? 0 },
    members: { active: BASELINE.activeMembers + newMembers, newThisMonth: BASELINE.newThisMonth + newMembers, renewals: BASELINE.renewalsThisMonth + liveRenewals, lapsed: BASELINE.lapsedThisMonth },
    classes: {
      avgFillPct: Math.round(average(week.map(c => (c.booked / c.capacity) * 100))),
      top: [...week].sort((a, b) => b.booked / b.capacity - a.booked / a.capacity).slice(0, 5),
      ptThisWeek: store.ptSessions.filter(s => s.status !== 'cancelled' && s.startsAt >= instant && bangkokDate(new Date(s.startsAt)) < weekEnd).length,
    },
  };
}
