import 'server-only';
import { addDays, bangkokDate } from '@/api/lib/utils/utils/utils';
import type { ClassDto } from '@/api/types/classes/classes/classes.types';
import { monthStart } from '@/api/services/shared/shared/shared.date-range';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, bangkokStart, packagesById, prismaAs } from '@/api/lib/db/db/db';
import { authorize, can } from '@/api/lib/auth/auth/auth.rbac';
import { listClasses } from '@/api/dal/classes/classes/classes.dal';

export interface DashboardData {
  inGym: { now: number; capacity: number };
  checkInsToday: { count: number; changePct: number };
  activeMembers: { count: number; newThisMonth: number };
  /** null เมื่อผู้ใช้ไม่มีสิทธิ์ดูรายได้ (เช่น เคาน์เตอร์) — รายได้เป็นข้อมูล Internal (§11.1) */
  revenueMonth: { satang: number; changePct: number; pendingSlips: number } | null;
  /** [ชั่วโมง, เช็กอินแล้ว, คาดการณ์ (เฉพาะชั่วโมงปัจจุบันและอนาคต)] */
  hourly: [number, number, number?][];
  currentHour: number;
  classes: ClassDto[];
  packageMix: { name: string; count: number; color: string }[];
}

/** ความจุของยิม (คน) — ตั้ง GYM_CAPACITY ใน .env */
const capacity = () => Number(process.env.GYM_CAPACITY ?? 120);
/** ถือว่าอยู่ในยิมถ้าเช็กอินภายในกี่ชั่วโมงที่ผ่านมา */
const STAY_HOURS = 2;
const OPEN_HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const MIX_COLORS = ['var(--color-cyan)', 'var(--color-warn)', 'var(--color-lime)', 'var(--color-violet)'];

const hourOf = (d: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hourCycle: 'h23' }).format(d));
const pct = (current: number, previous: number) => (previous ? Math.round(((current - previous) / previous) * 1000) / 10 : 0);

export async function getDashboard(session: Session): Promise<DashboardData> {
  await authorize(session, 'dashboard.view');
  const db = prismaAs(session);
  const instant = now();
  const date = today();
  const month = monthStart(date);
  const day = Number(date.slice(8, 10));
  const lastMonthStart = monthStart(addDays(month, -1));
  const lastMonthSameDay = addDays(lastMonthStart, day - 1);
  const [recent, inGym, active, newThisMonth, pkgs, byPackage] = await Promise.all([
    // วันนี้ + 4 สัปดาห์ก่อน (ใช้คาดการณ์รายชั่วโมงจากวันเดียวกันของสัปดาห์ก่อน ๆ)
    db.checkIn.findMany({ where: { allowed: true, at: { gte: bangkokStart(addDays(date, -28)) } }, select: { at: true } }),
    db.checkIn.count({ where: { allowed: true, at: { gte: new Date(instant.getTime() - STAY_HOURS * 3_600_000), lte: instant } } }),
    db.member.count({ where: { expiresOn: { gte: asDay(date) } } }),
    db.member.count({ where: { joinedOn: { gte: asDay(month) } } }),
    packagesById(db),
    db.member.groupBy({ by: ['packageId'], where: { expiresOn: { gte: asDay(date) } }, _count: true }),
  ]);
  const days = recent.map(c => ({ date: bangkokDate(c.at), hour: hourOf(c.at) }));
  const todayCount = days.filter(d => d.date === date).length;
  const lastWeekCount = days.filter(d => d.date === addDays(date, -7)).length;
  const currentHour = hourOf(instant);
  const sameWeekday = [7, 14, 21, 28].map(n => addDays(date, -n));
  const hourly = OPEN_HOURS.map((h): [number, number, number?] => {
    const done = days.filter(d => d.date === date && d.hour === h).length;
    if (h < currentHour) return [h, done];
    const forecast = Math.round(days.filter(d => sameWeekday.includes(d.date) && d.hour === h).length / sameWeekday.length);
    return [h, done, Math.max(forecast, done)];
  });

  let revenueMonth: DashboardData['revenueMonth'] = null;
  if (can(session, 'revenue.view')) {
    const [thisMonth, lastMonth, pendingSlips] = await Promise.all([
      db.payment.aggregate({ where: { status: 'paid', paidAt: bangkokSpan(month, date) }, _sum: { amountSatang: true } }),
      db.payment.aggregate({ where: { status: 'paid', paidAt: bangkokSpan(lastMonthStart, lastMonthSameDay) }, _sum: { amountSatang: true } }),
      db.payment.count({ where: { status: 'review' } }),
    ]);
    const satang = thisMonth._sum.amountSatang ?? 0;
    revenueMonth = { satang, changePct: pct(satang, lastMonth._sum.amountSatang ?? 0), pendingSlips };
  }

  return {
    inGym: { now: inGym, capacity: capacity() },
    checkInsToday: { count: todayCount, changePct: pct(todayCount, lastWeekCount) },
    activeMembers: { count: active, newThisMonth },
    revenueMonth,
    hourly,
    currentHour,
    classes: (await listClasses(session, date, 1)).filter(c => c.state !== 'ended'),
    packageMix: byPackage
      .sort((a, b) => b._count - a._count)
      .map((r, i) => ({ name: pkgs.get(r.packageId)?.name ?? r.packageId, count: r._count, color: MIX_COLORS[i % MIX_COLORS.length] ?? 'var(--color-lime)' })),
  };
}
