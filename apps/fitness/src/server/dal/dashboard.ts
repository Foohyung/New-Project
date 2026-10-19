import 'server-only';
import { bangkokDate } from '@repo/utils';
import type { ClassDto } from '@/features/classes/types';
import type { Session } from '../auth';
import { today } from '../clock';
import { BASELINE, db } from '../db';
import { authorize, can } from '../rbac';
import { listClasses } from './classes';
import { checkInsToday } from './members';

export interface DashboardData {
  inGym: { now: number; capacity: number };
  checkInsToday: { count: number; changePct: number };
  activeMembers: { count: number; newThisMonth: number };
  /** null เมื่อผู้ใช้ไม่มีสิทธิ์ดูรายได้ (เช่น เคาน์เตอร์) — รายได้เป็นข้อมูล Internal (§11.1) */
  revenueMonth: { satang: number; changePct: number; pendingSlips: number } | null;
  hourly: [number, number, number?][];
  currentHour: number;
  classes: ClassDto[];
  packageMix: typeof BASELINE.packageMix;
}

export async function getDashboard(session: Session): Promise<DashboardData> {
  await authorize(session, 'dashboard.view');
  const store = db();
  const date = today();
  const liveCheckIns = await checkInsToday(session);
  const liveRevenue = store.payments.filter(p => !p.seeded && p.status === 'paid' && p.paidAt && bangkokDate(new Date(p.paidAt)) === date).reduce((s, p) => s + p.amountSatang, 0);
  const newMembers = store.members.filter(m => !/^\d+$/.test(m.id) && m.joinedOn === date).length;
  const hourly = BASELINE.hourly.map(([h, v, f]): [number, number, number?] => (h === BASELINE.currentHour ? [h, v + liveCheckIns, f] : f === undefined ? [h, v] : [h, v, f]));
  return {
    inGym: { now: BASELINE.inGym.now + liveCheckIns, capacity: BASELINE.inGym.capacity },
    checkInsToday: { count: BASELINE.checkInsToday + liveCheckIns, changePct: BASELINE.checkInsChangePct },
    activeMembers: { count: BASELINE.activeMembers + newMembers, newThisMonth: BASELINE.newThisMonth + newMembers },
    revenueMonth: can(session, 'revenue.view') ? { satang: BASELINE.revenueMonthSatang + liveRevenue, changePct: BASELINE.revenueChangePct, pendingSlips: store.payments.filter(p => p.status === 'review').length } : null,
    hourly,
    currentHour: BASELINE.currentHour,
    classes: (await listClasses(session, date, 1)).filter(c => c.state !== 'ended'),
    packageMix: BASELINE.packageMix,
  };
}
