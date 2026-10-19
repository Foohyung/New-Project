import 'server-only';
import { bangkokDate, daysBetween, formatThaiDate } from '@repo/utils';
import { inRange, monthStart, type DateRange } from '@/features/shared/date-range';
import { isFrozenOn } from '@/features/members/service';
import { CHANNEL_LABEL, renderTemplate, ROUND_LABEL, roundForDaysLeft, type Channel, type ReminderRound, type RoundId } from '@/features/reminders/service';
import type { ReminderCenterDto } from '@/features/reminders/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type MemberRecord, type Store } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';

/** ลิงก์ในข้อความ: เปิดแอปสมาชิกพร้อมคูปอง (ระยะที่ 2 เป็น magic link ที่ login ให้อัตโนมัติ) */
export function payLink(couponCode: string | null): string {
  const query = new URLSearchParams({ from: 'reminder', ...(couponCode ? { coupon: couponCode } : {}) });
  return `https://fitflow.app/me?${query.toString()}`;
}

export function messageFor(store: Store, round: ReminderRound, m: MemberRecord): string {
  const pkg = store.packages.find(p => p.id === m.packageId);
  return renderTemplate(round.template, {
    ชื่อ: m.name.split(' ')[0] ?? m.name,
    แพ็กเกจ: pkg?.name ?? '',
    วันหมดอายุ: formatThaiDate(m.expiresOn, 'long'),
    คูปอง: round.couponCode ?? '',
    ลิงก์ชำระ: payLink(round.couponCode),
  });
}

/** สมาชิกที่ต้องได้รับข้อความวันนี้ — ไม่ส่งให้คนที่ไม่ยินยอม คนที่พักอยู่ คนที่ตัดบัตรอัตโนมัติ และ Day pass */
function dueToday(store: Store): { member: MemberRecord; round: ReminderRound }[] {
  const date = today();
  return store.members.flatMap(m => {
    const pkg = store.packages.find(p => p.id === m.packageId);
    if (!m.marketingConsent || m.autoRenew || isFrozenOn(m.freeze, date) || pkg?.kind !== 'time') return [];
    const round = roundForDaysLeft(daysBetween(date, m.expiresOn), store.reminderRounds);
    const already = store.reminderLogs.some(l => l.memberId === m.id && l.roundId === round?.id && daysBetween(l.sentAt.slice(0, 10), date) < 2);
    return round && !already ? [{ member: m, round }] : [];
  });
}

/** สถิติและประวัติตามช่วงวันที่ (ค่าเริ่มต้น = เดือนนี้) */
export async function getReminderCenter(session: Session, range: DateRange | null = null): Promise<ReminderCenterDto> {
  await authorize(session, 'marketing.manage');
  const store = db();
  const period = range ?? { from: monthStart(today()), to: today() };
  const logs = store.reminderLogs.filter(l => inRange(bangkokDate(new Date(l.sentAt)), period)).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const paid = logs.flatMap(l => store.payments.filter(p => p.id === l.paymentId && p.status === 'paid'));
  const sample = store.members.find(m => m.id === '02') ?? store.members[0];
  return {
    rounds: store.reminderRounds.map(r => ({ ...r, ...ROUND_LABEL[r.id], preview: sample ? messageFor(store, r, sample) : r.template })),
    stats: {
      sent: logs.length,
      byChannel: (['line', 'sms', 'email'] as Channel[]).map(c => `${CHANNEL_LABEL[c]} ${String(logs.filter(l => l.channels.includes(c)).length)}`).join(' · '),
      clickRate: logs.length ? Math.round((logs.filter(l => l.clicked).length / logs.length) * 100) : 0,
      paidCount: paid.length,
      revenueSatang: paid.reduce((sum, p) => sum + p.amountSatang, 0),
    },
    due: dueToday(store).map(({ member, round }) => ({ memberId: member.id, name: member.name, roundTitle: ROUND_LABEL[round.id].title, expiresOn: member.expiresOn, channels: round.channels.map(c => CHANNEL_LABEL[c]).join(' + ') })),
    logs: logs.slice(0, 50).map(l => ({
      id: l.id,
      memberId: l.memberId,
      name: store.members.find(m => m.id === l.memberId)?.name ?? '—',
      roundTitle: l.roundId === 'manual' ? 'ส่งเอง' : ROUND_LABEL[l.roundId].title,
      channels: l.channels.map(c => CHANNEL_LABEL[c]).join(' + '),
      sentAt: l.sentAt,
      outcome: l.paymentId && store.payments.some(p => p.id === l.paymentId && p.status === 'paid') ? 'paid' : l.paymentId ? 'pending' : l.clicked ? 'clicked' : 'sent',
    })),
    excludedNoConsent: store.members.filter(m => !m.marketingConsent).length,
  };
}

export async function updateRound(session: Session, id: RoundId, input: { enabled: boolean; channels: Channel[]; template: string; couponCode: string | null }): Promise<void> {
  await authorize(session, 'marketing.manage');
  const store = db();
  const round = store.reminderRounds.find(r => r.id === id);
  if (!round) throw new Error('NOT_FOUND');
  if (input.couponCode && !store.coupons.some(c => c.code === input.couponCode)) throw new Error('COUPON:not-found');
  Object.assign(round, input);
}

/** ส่งข้อความรอบวันนี้ (ระยะที่ 2 เป็น cron job ทุกเช้า 09:00 ส่งผ่าน LINE Messaging API / SMS gateway) */
export async function runReminders(session: Session): Promise<number> {
  await authorize(session, 'marketing.manage');
  const store = db();
  const due = dueToday(store);
  for (const { member, round } of due) {
    store.reminderLogs.push({ id: nextId('r'), memberId: member.id, roundId: round.id, channels: round.channels, sentAt: now().toISOString(), clicked: false, paymentId: null });
  }
  return due.length;
}

/** ส่งเตือนรายคน (จากหน้าโปรไฟล์ / หน้าติดตามสมาชิก) */
export async function sendManualReminder(session: Session, memberId: string): Promise<{ name: string }> {
  if (!can(session, 'members.manage') && !can(session, 'retention.view')) throw new ForbiddenError();
  await Promise.resolve();
  const store = db();
  const m = store.members.find(x => x.id === memberId);
  if (!m) throw new Error('NOT_FOUND');
  if (!m.marketingConsent) throw new Error('NO_CONSENT');
  store.reminderLogs.push({ id: nextId('r'), memberId: m.id, roundId: 'manual', channels: ['line'], sentAt: now().toISOString(), clicked: false, paymentId: null });
  return { name: m.name };
}
