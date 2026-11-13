import 'server-only';
import { addDays, bangkokDate } from '@/api/lib/utils/utils/utils';
import { average, type DailyValue } from '@/api/services/reports/reports/reports.service';
import { eachDay, inRange, monthStart as monthStartOf, type DateRange } from '@/api/services/shared/shared/shared.date-range';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, bangkokStart, packagesById, prisma, prismaAs } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import { managedBranches } from '@/api/dal/users/users/users.dal';

export interface ReportDto {
  monthLabelFrom: string;
  to: string;
  range: DateRange;
  branch: string | null;
  /** วันแรกที่มีข้อมูล */
  dataFrom: string;
  /** รายได้ทุกวันที่มีข้อมูล (สตางค์) — ใช้ทำ heatmap ในปฏิทิน */
  revenueByDay: Record<string, number>;
  revenue: { totalSatang: number; monthSatang: number; changePct: number; daily: DailyValue[]; avgDailySatang: number; pendingSatang: number };
  byPackage: { id: string; name: string; satang: number; count: number }[];
  byCourse: { id: string; name: string; satang: number; count: number }[];
  byProduct: { id: string; name: string; satang: number; quantity: number }[];
  otherIncome: { coursesSatang: number; salesSatang: number; salesCount: number };
  checkIns: { daily: DailyValue[]; avg: number; today: number };
  members: { active: number; newThisMonth: number; renewals: number; lapsed: number };
  classes: { avgFillPct: number; top: { id: string; title: string; startsAt: string; booked: number; capacity: number }[]; ptThisWeek: number };
}

const sumBy = (rows: { date: string; value: number }[]) => {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.date, (out.get(r.date) ?? 0) + r.value);
  return out;
};

/** สาขาที่ผู้ใช้มีสิทธิ์ดูรายงาน — admin ดูทุกสาขา, owner ดูสาขาที่รับผิดชอบ, บทบาทอื่นดูสาขาตัวเอง */
export async function getReportBranches(session: Session): Promise<string[]> {
  await authorize(session, 'reports.view');
  if (session.role === 'admin') {
    const db = prisma();
    const [branches, users, ownerBranches] = await Promise.all([
      db.branch.findMany({ select: { name: true }, orderBy: [{ createdAt: 'asc' }, { name: 'asc' }] }),
      db.user.findMany({ select: { branch: true } }),
      db.ownerBranch.findMany({ select: { branch: true } }),
    ]);
    const configured = new Set(branches.map(branch => branch.name));
    const legacy = [...new Set([...users.map(user => user.branch), ...ownerBranches.map(row => row.branch)])]
      .filter(branch => !configured.has(branch) && branch !== session.branch)
      .sort((a, b) => a.localeCompare(b, 'th'));
    return [session.branch, ...branches.map(branch => branch.name).filter(branch => branch !== session.branch), ...legacy];
  }
  if (session.role === 'owner') return (await managedBranches(session)) ?? [session.branch];
  return [session.branch];
}

/** รายงานตามช่วงวันที่ (ค่าเริ่มต้น = ต้นเดือนถึงวันนี้) — ตัวเลขสมาชิกเป็นของเดือนนี้เสมอ */
export async function getReport(session: Session, requested: DateRange | null = null, requestedBranch?: string): Promise<ReportDto> {
  await authorize(session, 'reports.view');
  const db = prismaAs(session);
  const branches = await getReportBranches(session);
  const branch = requestedBranch && branches.includes(requestedBranch) ? requestedBranch : null;
  const scopedBranches = branch ? [branch] : session.role === 'admin' ? null : branches;
  const creatorIds = scopedBranches
    ? (await prisma().user.findMany({ where: { branch: { in: scopedBranches } }, select: { id: true } })).map(user => user.id)
    : null;
  const creatorFilter = creatorIds ? { createdById: { in: creatorIds } } : {};
  const to = today();
  const monthStart = monthStartOf(to);
  const range = requested ?? { from: monthStart, to };
  const lastMonthStart = monthStartOf(addDays(monthStart, -1));
  const lastMonthSameDay = addDays(lastMonthStart, Number(to.slice(8, 10)) - 1);
  // heatmap ย้อนหลังสูงสุด 1 ปี + ช่วงที่ขอ
  const since = [addDays(to, -365), range.from].sort()[0] ?? range.from;
  const through = [range.to, to].sort().at(-1) ?? to;
  const revenueSpan = bangkokSpan(since, through);
  const weekEnd = addDays(to, 6);
  const pkgs = await packagesById(db);
  const timePackages = [...pkgs.values()].filter(p => p.kind === 'time').map(p => p.id);
  const [
    paid, pending, checkIns, firstPayment, active, newMembers, renewals, lapsed, week, ptThisWeek,
    coursePayments, sales,
  ] = await Promise.all([
    db.payment.findMany({ where: { ...creatorFilter, status: 'paid', paidAt: revenueSpan }, select: { paidAt: true, amountSatang: true, packageId: true } }),
    db.payment.aggregate({ where: { ...creatorFilter, status: { not: 'paid' } }, _sum: { amountSatang: true } }),
    db.checkIn.findMany({ where: { ...creatorFilter, allowed: true, at: bangkokSpan(range.from, range.to > to ? range.to : to) }, select: { at: true } }),
    db.payment.findFirst({ where: { ...creatorFilter, status: 'paid' }, orderBy: { paidAt: 'asc' }, select: { paidAt: true } }),
    db.member.count({ where: { ...creatorFilter, expiresOn: { gte: asDay(to) } } }),
    db.member.count({ where: { ...creatorFilter, joinedOn: { gte: asDay(monthStart) } } }),
    db.payment.count({ where: { ...creatorFilter, kind: 'renew', status: 'paid', paidAt: bangkokSpan(monthStart, to) } }),
    db.member.count({ where: { ...creatorFilter, packageId: { in: timePackages }, expiresOn: { gte: asDay(monthStart), lt: asDay(to) } } }),
    db.gymClass.findMany({ where: { ...creatorFilter, startsAt: bangkokSpan(to, weekEnd) }, include: { _count: { select: { bookings: { where: { status: 'booked' } } } } } }),
    db.ptSession.count({ where: { ...creatorFilter, status: { not: 'cancelled' }, startsAt: { gte: now(), lt: bangkokStart(addDays(to, 7)) } } }),
    db.courseEnrollment.findMany({
      where: { ...creatorFilter, status: 'paid', paidAt: revenueSpan },
      select: { courseId: true, amountSatang: true, paidAt: true, course: { select: { title: true } } },
    }),
    db.sale.findMany({
      where: { ...creatorFilter, voidedAt: null, createdAt: revenueSpan },
      select: { createdAt: true, totalSatang: true, items: { select: { productId: true, name: true, priceSatang: true, qty: true } } },
    }),
  ]);

  const revenueOf = sumBy([
    ...paid.flatMap(p => (p.paidAt ? [{ date: bangkokDate(p.paidAt), value: p.amountSatang }] : [])),
    ...coursePayments.flatMap(p => (p.paidAt ? [{ date: bangkokDate(p.paidAt), value: p.amountSatang }] : [])),
    ...sales.map(s => ({ date: bangkokDate(s.createdAt), value: s.totalSatang })),
  ]);
  const sumDays = (from: string, until: string) => [...revenueOf].filter(([d]) => d >= from && d <= until).reduce((s, [, v]) => s + v, 0);
  const rangeDaily = eachDay(range).map(date => ({ date, value: revenueOf.get(date) ?? 0 }));
  const totalSatang = rangeDaily.reduce((s, d) => s + d.value, 0);
  const monthSatang = sumDays(monthStart, to);
  const lastMonthSatang = sumDays(lastMonthStart, lastMonthSameDay);

  const byPackageMap = sumBy(paid.flatMap(p => (p.paidAt && inRange(bangkokDate(p.paidAt), range) ? [{ date: p.packageId, value: p.amountSatang }] : [])));
  const byPackage = [...byPackageMap]
    .map(([id, satang]) => ({ id, name: pkgs.get(id)?.name ?? id, satang, count: paid.filter(p => p.packageId === id && p.paidAt && inRange(bangkokDate(p.paidAt), range)).length }))
    .filter(p => p.satang > 0)
    .sort((a, b) => b.satang - a.satang);

  const byCourseMap = new Map<string, { name: string; satang: number; count: number }>();
  for (const payment of coursePayments) {
    if (!payment.paidAt || !inRange(bangkokDate(payment.paidAt), range)) continue;
    const current = byCourseMap.get(payment.courseId) ?? { name: payment.course.title, satang: 0, count: 0 };
    current.satang += payment.amountSatang;
    current.count += 1;
    byCourseMap.set(payment.courseId, current);
  }
  const byCourse = [...byCourseMap].map(([id, data]) => ({ id, ...data })).sort((a, b) => b.satang - a.satang);
  const byProductMap = new Map<string, { name: string; satang: number; quantity: number }>();
  for (const sale of sales) {
    if (!inRange(bangkokDate(sale.createdAt), range)) continue;
    for (const item of sale.items) {
      const key = `${item.productId}:${item.name}`;
      const current = byProductMap.get(key) ?? { name: item.name, satang: 0, quantity: 0 };
      current.satang += item.priceSatang * item.qty;
      current.quantity += item.qty;
      byProductMap.set(key, current);
    }
  }
  const byProduct = [...byProductMap].map(([id, data]) => ({ id, ...data })).sort((a, b) => b.satang - a.satang);
  const coursesSatang = byCourse.reduce((sum, course) => sum + course.satang, 0);
  const salesSatang = sales.filter(s => inRange(bangkokDate(s.createdAt), range)).reduce((sum, sale) => sum + sale.totalSatang, 0);
  const salesCount = sales.filter(s => inRange(bangkokDate(s.createdAt), range)).length;
  const firstRevenueDate = [
    ...(firstPayment?.paidAt ? [bangkokDate(firstPayment.paidAt)] : []),
    ...coursePayments.flatMap(payment => payment.paidAt ? [bangkokDate(payment.paidAt)] : []),
    ...sales.map(sale => bangkokDate(sale.createdAt)),
  ].sort()[0];

  const checkInsOf = sumBy(checkIns.map(c => ({ date: bangkokDate(c.at), value: 1 })));
  const checkInsDaily = eachDay(range).map(date => ({ date, value: checkInsOf.get(date) ?? 0 }));
  const checkInDays = checkInsDaily.filter(d => d.value > 0);

  const classes = week.map(c => ({ id: c.id, title: c.title, startsAt: c.startsAt.toISOString(), capacity: c.capacity, booked: c.otherBooked + c._count.bookings }));

  return {
    monthLabelFrom: monthStart,
    to,
    range,
    branch,
    dataFrom: firstRevenueDate ?? monthStart,
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
    byCourse,
    byProduct,
    otherIncome: { coursesSatang, salesSatang, salesCount },
    checkIns: { daily: checkInsDaily, avg: Math.round(average(checkInDays.map(d => d.value))), today: checkInsOf.get(to) ?? 0 },
    members: { active, newThisMonth: newMembers, renewals, lapsed },
    classes: {
      avgFillPct: Math.round(average(classes.map(c => (c.booked / c.capacity) * 100))),
      top: [...classes].sort((a, b) => b.booked / b.capacity - a.booked / a.capacity).slice(0, 5),
      ptThisWeek,
    },
  };
}
