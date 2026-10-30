import 'server-only';
import { addDays, bangkokDate } from '@/api/lib/utils/utils/utils';
import { average, type DailyValue } from '@/api/services/reports/reports/reports.service';
import { eachDay, inRange, monthStart as monthStartOf, type DateRange } from '@/api/services/shared/shared/shared.date-range';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, bangkokStart, packagesById, prismaAs } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';

export interface ReportDto {
  monthLabelFrom: string;
  to: string;
  range: DateRange;
  /** วันแรกที่มีข้อมูล */
  dataFrom: string;
  /** รายได้ทุกวันที่มีข้อมูล (สตางค์) — ใช้ทำ heatmap ในปฏิทิน */
  revenueByDay: Record<string, number>;
  revenue: { totalSatang: number; monthSatang: number; changePct: number; daily: DailyValue[]; avgDailySatang: number; pendingSatang: number };
  byPackage: { id: string; name: string; satang: number }[];
  checkIns: { daily: DailyValue[]; avg: number; today: number };
  members: { active: number; newThisMonth: number; renewals: number; lapsed: number };
  classes: { avgFillPct: number; top: { id: string; title: string; startsAt: string; booked: number; capacity: number }[]; ptThisWeek: number };
}

const sumBy = (rows: { date: string; value: number }[]) => {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.date, (out.get(r.date) ?? 0) + r.value);
  return out;
};

/** รายงานตามช่วงวันที่ (ค่าเริ่มต้น = ต้นเดือนถึงวันนี้) — ตัวเลขสมาชิกเป็นของเดือนนี้เสมอ */
export async function getReport(session: Session, requested: DateRange | null = null): Promise<ReportDto> {
  await authorize(session, 'reports.view');
  const db = prismaAs(session);
  const to = today();
  const monthStart = monthStartOf(to);
  const range = requested ?? { from: monthStart, to };
  const lastMonthStart = monthStartOf(addDays(monthStart, -1));
  const lastMonthSameDay = addDays(lastMonthStart, Number(to.slice(8, 10)) - 1);
  // heatmap ย้อนหลังสูงสุด 1 ปี + ช่วงที่ขอ
  const since = [addDays(to, -365), range.from].sort()[0] ?? range.from;
  const weekEnd = addDays(to, 6);
  const pkgs = await packagesById(db);
  const timePackages = [...pkgs.values()].filter(p => p.kind === 'time').map(p => p.id);
  const [paid, pending, checkIns, firstPayment, active, newMembers, renewals, lapsed, week, ptThisWeek] = await Promise.all([
    db.payment.findMany({ where: { status: 'paid', paidAt: bangkokSpan(since, [range.to, to].sort().at(-1) ?? to) }, select: { paidAt: true, amountSatang: true, packageId: true } }),
    db.payment.aggregate({ where: { status: { not: 'paid' } }, _sum: { amountSatang: true } }),
    db.checkIn.findMany({ where: { allowed: true, at: bangkokSpan(range.from, range.to > to ? range.to : to) }, select: { at: true } }),
    db.payment.findFirst({ where: { status: 'paid' }, orderBy: { paidAt: 'asc' }, select: { paidAt: true } }),
    db.member.count({ where: { expiresOn: { gte: asDay(to) } } }),
    db.member.count({ where: { joinedOn: { gte: asDay(monthStart) } } }),
    db.payment.count({ where: { kind: 'renew', status: 'paid', paidAt: bangkokSpan(monthStart, to) } }),
    db.member.count({ where: { packageId: { in: timePackages }, expiresOn: { gte: asDay(monthStart), lt: asDay(to) } } }),
    db.gymClass.findMany({ where: { startsAt: bangkokSpan(to, weekEnd) }, include: { _count: { select: { bookings: { where: { status: 'booked' } } } } } }),
    db.ptSession.count({ where: { status: { not: 'cancelled' }, startsAt: { gte: now(), lt: bangkokStart(addDays(to, 7)) } } }),
  ]);

  const revenueOf = sumBy(paid.flatMap(p => (p.paidAt ? [{ date: bangkokDate(p.paidAt), value: p.amountSatang }] : [])));
  const sumDays = (from: string, until: string) => [...revenueOf].filter(([d]) => d >= from && d <= until).reduce((s, [, v]) => s + v, 0);
  const rangeDaily = eachDay(range).map(date => ({ date, value: revenueOf.get(date) ?? 0 }));
  const totalSatang = rangeDaily.reduce((s, d) => s + d.value, 0);
  const monthSatang = sumDays(monthStart, to);
  const lastMonthSatang = sumDays(lastMonthStart, lastMonthSameDay);

  const byPackageMap = sumBy(paid.flatMap(p => (p.paidAt && inRange(bangkokDate(p.paidAt), range) ? [{ date: p.packageId, value: p.amountSatang }] : [])));
  const byPackage = [...byPackageMap]
    .map(([id, satang]) => ({ id, name: pkgs.get(id)?.name ?? id, satang }))
    .filter(p => p.satang > 0)
    .sort((a, b) => b.satang - a.satang);

  const checkInsOf = sumBy(checkIns.map(c => ({ date: bangkokDate(c.at), value: 1 })));
  const checkInsDaily = eachDay(range).map(date => ({ date, value: checkInsOf.get(date) ?? 0 }));
  const checkInDays = checkInsDaily.filter(d => d.value > 0);

  const classes = week.map(c => ({ id: c.id, title: c.title, startsAt: c.startsAt.toISOString(), capacity: c.capacity, booked: c.otherBooked + c._count.bookings }));

  return {
    monthLabelFrom: monthStart,
    to,
    range,
    dataFrom: firstPayment?.paidAt ? bangkokDate(firstPayment.paidAt) : monthStart,
    revenueByDay: Object.fromEntries([...revenueOf].filter(([d]) => d <= to)),
    revenue: {
      totalSatang,
      monthSatang,
      changePct: lastMonthSatang ? Math.round(((monthSatang - lastMonthSatang) / lastMonthSatang) * 1000) / 10 : 0,
      daily: rangeDaily,
      avgDailySatang: Math.round(totalSatang / (rangeDaily.length || 1)),
      pendingSatang: pending._sum.amountSatang ?? 0,
    },
    byPackage,
    checkIns: { daily: checkInsDaily, avg: Math.round(average(checkInDays.map(d => d.value))), today: checkInsOf.get(to) ?? 0 },
    members: { active, newThisMonth: newMembers, renewals, lapsed },
    classes: {
      avgFillPct: Math.round(average(classes.map(c => (c.booked / c.capacity) * 100))),
      top: [...classes].sort((a, b) => b.booked / b.capacity - a.booked / a.capacity).slice(0, 5),
      ptThisWeek,
    },
  };
}
