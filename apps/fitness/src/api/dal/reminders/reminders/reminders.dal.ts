import 'server-only';
import { daysBetween, formatThaiDate } from '@/api/lib/utils/utils/utils';
import { monthStart, type DateRange } from '@/api/services/shared/shared/shared.date-range';
import { isFrozenOn } from '@/api/services/members/members/members.service';
import { CHANNEL_LABEL, renderTemplate, ROUND_LABEL, roundForDaysLeft, type Channel, type ReminderRound, type RoundId } from '@/api/services/reminders/reminders/reminders.service';
import type { ReminderCenterDto } from '@/api/types/reminders/reminders/reminders.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { bangkokSpan, packagesById, prismaAs, toMember, toReminderLog, toRound, type MemberRecord, type PackageRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';

/** ลิงก์ในข้อความ: เปิดแอปสมาชิกพร้อมคูปอง — ตั้ง APP_URL เป็นโดเมนจริงของเว็บ */
export function payLink(couponCode: string | null): string {
  const query = new URLSearchParams({ from: 'reminder', ...(couponCode ? { coupon: couponCode } : {}) });
  return `${process.env.APP_URL ?? 'https://fitflow.app'}/me?${query.toString()}`;
}

export function messageFor(pkgs: Map<string, PackageRecord>, round: ReminderRound, m: MemberRecord): string {
  return renderTemplate(round.template, {
    ชื่อ: m.name.split(' ')[0] ?? m.name,
    แพ็กเกจ: pkgs.get(m.packageId)?.name ?? '',
    วันหมดอายุ: formatThaiDate(m.expiresOn, 'long'),
    คูปอง: round.couponCode ?? '',
    ลิงก์ชำระ: payLink(round.couponCode),
  });
}

async function rounds(db: Tx): Promise<ReminderRound[]> {
  const rows = await db.reminderRound.findMany({ orderBy: { offsetDays: 'asc' } });
  return rows.flatMap(r => toRound(r) ?? []);
}

/** สมาชิกที่ต้องได้รับข้อความวันนี้ — ไม่ส่งให้คนที่ไม่ยินยอม คนที่พักอยู่ คนที่ตัดบัตรอัตโนมัติ และ Day pass */
async function dueToday(db: Tx): Promise<{ member: MemberRecord; round: ReminderRound }[]> {
  const date = today();
  const [allRounds, pkgs, members, recent] = await Promise.all([
    rounds(db),
    packagesById(db),
    db.member.findMany({ where: { marketingConsent: true, autoRenewSince: null } }),
    // ข้อความที่ส่งไปใน 2 วันล่าสุด (กันส่งซ้ำ)
    db.reminderLog.findMany({ where: { sentAt: { gte: new Date(now().getTime() - 3 * 86_400_000) } } }),
  ]);
  return members.flatMap(row => {
    const m = toMember(row);
    if (isFrozenOn(m.freeze, date) || pkgs.get(m.packageId)?.kind !== 'time') return [];
    const round = roundForDaysLeft(daysBetween(date, m.expiresOn), allRounds);
    const already = recent.some(l => l.memberId === m.id && l.roundId === round?.id && daysBetween(l.sentAt.toISOString().slice(0, 10), date) < 2);
    return round && !already ? [{ member: m, round }] : [];
  });
}

/** สถิติและประวัติตามช่วงวันที่ (ค่าเริ่มต้น = เดือนนี้) */
export async function getReminderCenter(session: Session, range: DateRange | null = null): Promise<ReminderCenterDto> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const period = range ?? { from: monthStart(today()), to: today() };
  const [allRounds, pkgs, logRows, sampleRow, excludedNoConsent, due] = await Promise.all([
    rounds(db),
    packagesById(db),
    db.reminderLog.findMany({ where: { sentAt: bangkokSpan(period.from, period.to) }, include: { member: { select: { name: true } }, payment: { select: { status: true, amountSatang: true } } }, orderBy: { sentAt: 'desc' } }),
    db.member.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.member.count({ where: { marketingConsent: false } }),
    dueToday(db),
  ]);
  const logs = logRows.map(l => ({ ...toReminderLog(l), name: l.member.name, payment: l.payment }));
  const paid = logs.flatMap(l => (l.payment?.status === 'paid' ? [l.payment] : []));
  const sample = sampleRow ? toMember(sampleRow) : null;
  return {
    rounds: allRounds.map(r => ({ ...r, ...ROUND_LABEL[r.id], preview: sample ? messageFor(pkgs, r, sample) : r.template })),
    stats: {
      sent: logs.length,
      byChannel: (['line', 'sms', 'email'] as Channel[]).map(c => `${CHANNEL_LABEL[c]} ${String(logs.filter(l => l.channels.includes(c)).length)}`).join(' · '),
      clickRate: logs.length ? Math.round((logs.filter(l => l.clicked).length / logs.length) * 100) : 0,
      paidCount: paid.length,
      revenueSatang: paid.reduce((sum, p) => sum + p.amountSatang, 0),
    },
    due: due.map(({ member, round }) => ({ memberId: member.id, name: member.name, roundTitle: ROUND_LABEL[round.id].title, expiresOn: member.expiresOn, channels: round.channels.map(c => CHANNEL_LABEL[c]).join(' + ') })),
    logs: logs.slice(0, 50).map(l => ({
      id: l.id,
      memberId: l.memberId,
      name: l.name,
      roundTitle: l.roundId === 'manual' ? 'ส่งเอง' : ROUND_LABEL[l.roundId].title,
      channels: l.channels.map(c => CHANNEL_LABEL[c]).join(' + '),
      sentAt: l.sentAt,
      outcome: l.payment?.status === 'paid' ? 'paid' : l.paymentId ? 'pending' : l.clicked ? 'clicked' : 'sent',
    })),
    excludedNoConsent,
  };
}

export async function updateRound(session: Session, id: RoundId, input: { enabled: boolean; channels: Channel[]; template: string; couponCode: string | null }): Promise<void> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  if (!(await db.reminderRound.findUnique({ where: { id } }))) throw new Error('NOT_FOUND');
  if (input.couponCode && !(await db.coupon.findUnique({ where: { code: input.couponCode } }))) throw new Error('COUPON:not-found');
  await db.reminderRound.update({ where: { id }, data: input });
}

/** ส่งข้อความรอบวันนี้ (ระบบจริงเป็น cron job ทุกเช้า 09:00 ส่งผ่าน LINE Messaging API / SMS gateway) */
export async function runReminders(session: Session): Promise<number> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const due = await dueToday(db);
  if (due.length > 0) {
    await db.reminderLog.createMany({ data: due.map(({ member, round }) => ({ memberId: member.id, roundId: round.id, channels: round.channels, sentAt: now() })) });
  }
  return due.length;
}

/** ส่งเตือนรายคน (จากหน้าโปรไฟล์ / หน้าติดตามสมาชิก) */
export async function sendManualReminder(session: Session, memberId: string): Promise<{ name: string }> {
  if (!can(session, 'members.manage') && !can(session, 'retention.view')) throw new ForbiddenError();
  const db = prismaAs(session);
  const m = await db.member.findUnique({ where: { id: memberId } });
  if (!m) throw new Error('NOT_FOUND');
  if (!m.marketingConsent) throw new Error('NO_CONSENT');
  await db.reminderLog.create({ data: { memberId: m.id, roundId: 'manual', channels: ['line'], sentAt: now() } });
  return { name: m.name };
}
