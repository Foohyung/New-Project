import 'server-only';
import { addDays, bangkokDate } from '@/api/lib/utils/utils/utils';
import { isFrozenOn } from '@/api/services/members/members/members.service';
import { chargeDueOn, declineReason, monthlyValueSatang, nextRetryOn, TEST_CARDS } from '@/api/services/subscriptions/subscriptions/subscriptions.service';
import type { MyAutoRenewDto, SubscriptionOverviewDto } from '@/api/types/subscriptions/subscriptions/subscriptions.types';
import type { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, packagesById, prismaAs, toCharge, toMember, transaction, type ChargeRecord, type MemberRecord, type PackageRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { createPaymentRecord } from '@/api/dal/payments/payments/payments.dal';

const AUTO = 'ตัดบัตรอัตโนมัติ';
const cardLabel = (m: MemberRecord) => (m.autoRenew ? `${m.autoRenew.card.brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${m.autoRenew.card.last4}` : '—');
const monthLabel = (date: string) => new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: 'UTC' }).format(asDay(date));

/** สมาชิกที่เปิดต่ออายุอัตโนมัติ (เฉพาะแพ็กเกจรายเดือน/รายปี) */
async function subscribers(db: Tx, pkgs: Map<string, PackageRecord>): Promise<MemberRecord[]> {
  const rows = await db.member.findMany({ where: { autoRenewSince: { not: null } } });
  return rows.map(toMember).filter(m => m.autoRenew && pkgs.get(m.packageId)?.kind === 'time');
}

export async function getSubscriptionOverview(session: Session): Promise<SubscriptionOverviewDto> {
  await authorize(session, 'payments.view');
  const db = prismaAs(session);
  const date = today();
  const pkgs = await packagesById(db);
  const timePackages = [...pkgs.values()].filter(p => p.kind === 'time').map(p => p.id);
  // 6 เดือนล่าสุดรวมเดือนนี้
  const [year = 0, month = 1] = date.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(year, month - 1 - (5 - i), 1)).toISOString().slice(0, 10));
  const [subs, timeMembers, charges, autoPaid] = await Promise.all([
    subscribers(db, pkgs),
    db.member.count({ where: { packageId: { in: timePackages } } }),
    db.charge.findMany({ include: { member: { select: { name: true } } }, orderBy: { dueOn: 'desc' } }),
    db.payment.findMany({ where: { receivedBy: AUTO, status: 'paid', paidAt: bangkokSpan(months[0] ?? date, date) }, select: { paidAt: true, amountSatang: true } }),
  ]);
  const mrr = subs.reduce((sum, m) => sum + monthlyValueSatang(pkgs.get(m.packageId) ?? { priceSatang: 0 }), 0);
  const all = charges.map(c => ({ ...toCharge(c), name: c.member.name }));
  return {
    subscribers: subs.length,
    sharePct: timeMembers ? Math.round((subs.length / timeMembers) * 100) : 0,
    mrrSatang: mrr,
    // ยอดที่ตัดบัตรได้จริงแต่ละเดือน
    mrrTrend: months.map(m => ({ month: monthLabel(m), satang: autoPaid.filter(p => p.paidAt && bangkokDate(p.paidAt).startsWith(m.slice(0, 7))).reduce((s, p) => s + p.amountSatang, 0) })),
    failing: all.filter(c => c.status === 'retrying').length,
    upcoming: subs
      .map(m => ({ m, dueOn: chargeDueOn(m.expiresOn), pkg: pkgs.get(m.packageId) }))
      .filter(({ m, dueOn }) => dueOn >= date && dueOn <= addDays(date, 7) && !all.some(c => c.memberId === m.id && c.dueOn === dueOn))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map(({ m, dueOn, pkg }) => ({ memberId: m.id, name: m.name, packageName: pkg?.name ?? '', amountSatang: pkg?.priceSatang ?? 0, dueOn, card: cardLabel(m) })),
    problems: all
      .filter((c): c is ChargeRecord & { name: string; status: 'retrying' | 'failed' } => c.status !== 'paid')
      .map(c => ({ chargeId: c.id, memberId: c.memberId, name: c.name, amountSatang: c.amountSatang, reason: c.attempts.at(-1)?.reason ?? '', attempts: c.attempts.map(a => ({ on: a.on, ok: a.ok })), nextRetryOn: c.status === 'retrying' ? nextRetryOn(c.dueOn, c.attempts.length) : null, status: c.status })),
    recent: all.filter(c => c.status === 'paid').map(c => ({ memberId: c.memberId, name: c.name, amountSatang: c.amountSatang, on: c.attempts.at(-1)?.on ?? c.dueOn, paymentId: c.paymentId })),
  };
}

/** ลองตัดบัตร 1 ครั้ง แล้วบันทึกผลลงรายการ charge */
async function attempt(tx: Tx, charge: ChargeRecord, m: MemberRecord, date: string): Promise<boolean> {
  const reason = m.autoRenew ? declineReason(m.autoRenew.card.last4) : 'ไม่มีบัตรที่บันทึกไว้';
  const attempts = [...charge.attempts, { on: date, ok: reason === null, reason }];
  const data: Prisma.ChargeUpdateInput = { attempts: attempts.map(a => ({ on: a.on, ok: a.ok, reason: a.reason })) };
  if (reason === null) {
    const p = await createPaymentRecord(tx, { memberId: m.id, packageId: charge.packageId, kind: 'renew', method: 'card', receivedBy: AUTO, instant: true });
    Object.assign(data, { status: 'paid', payment: { connect: { id: p.id } } });
  } else {
    data.status = nextRetryOn(charge.dueOn, attempts.filter(a => !a.ok).length) ? 'retrying' : 'failed';
  }
  await tx.charge.update({ where: { id: charge.id }, data });
  return reason === null;
}

/** รอบตัดบัตรประจำวัน (ระบบจริงเป็น cron job + webhook จาก payment gateway) */
export async function runBilling(session: Session): Promise<{ charged: number; failed: number }> {
  await authorize(session, 'payments.confirm');
  return transaction(session, async tx => {
    const date = today();
    const pkgs = await packagesById(tx);
    let charged = 0;
    let failed = 0;
    const tally = (ok: boolean) => {
      if (ok) charged++;
      else failed++;
    };
    // ลองใหม่รายการที่ตัดไม่ผ่านและถึงกำหนด
    for (const row of await tx.charge.findMany({ where: { status: 'retrying' }, include: { member: true } })) {
      const c = toCharge(row);
      const retryOn = nextRetryOn(c.dueOn, c.attempts.filter(a => !a.ok).length);
      if (retryOn && retryOn <= date && !c.attempts.some(a => a.on === date)) tally(await attempt(tx, c, toMember(row.member), date));
    }
    // รอบใหม่ที่ถึงกำหนดวันนี้
    for (const m of await subscribers(tx, pkgs)) {
      if (isFrozenOn(m.freeze, date)) continue;
      const dueOn = chargeDueOn(m.expiresOn);
      const pkg = pkgs.get(m.packageId);
      if (dueOn > date || !pkg || (await tx.charge.count({ where: { memberId: m.id, dueOn: asDay(dueOn) } })) > 0) continue;
      const row = await tx.charge.create({ data: { memberId: m.id, packageId: pkg.id, amountSatang: pkg.priceSatang, dueOn: asDay(dueOn), attempts: [] } });
      tally(await attempt(tx, toCharge(row), m, date));
    }
    return { charged, failed };
  });
}

/** ตัดไม่ผ่าน → สร้างรายการ PromptPay ให้สมาชิกจ่ายเอง */
export async function sendPayLinkForCharge(session: Session, chargeId: string): Promise<string> {
  await authorize(session, 'payments.collect');
  return transaction(session, async tx => {
    const c = await tx.charge.findUnique({ where: { id: chargeId } });
    if (!c || c.status === 'paid') throw new Error('NOT_FOUND');
    const p = await createPaymentRecord(tx, { memberId: c.memberId, packageId: c.packageId, kind: 'renew', method: 'promptpay', receivedBy: null });
    await tx.reminderLog.create({ data: { memberId: c.memberId, roundId: 'manual', channels: ['line', 'sms'], sentAt: now(), paymentId: p.id } });
    await tx.charge.update({ where: { id: chargeId }, data: { status: 'failed' } });
    return p.id;
  });
}

export async function getMyAutoRenew(session: Session): Promise<MyAutoRenewDto> {
  await authorize(session, 'portal.use');
  const db = prismaAs(session);
  const row = session.memberId ? await db.member.findUnique({ where: { id: session.memberId } }) : null;
  if (!row) throw new ForbiddenError();
  const m = toMember(row);
  const pkg = (await packagesById(db)).get(m.packageId);
  return {
    eligible: pkg?.kind === 'time',
    enabled: m.autoRenew !== null,
    card: m.autoRenew?.card ?? null,
    packageName: pkg?.name ?? '',
    amountSatang: pkg?.priceSatang ?? 0,
    nextChargeOn: m.autoRenew ? chargeDueOn(m.expiresOn) : null,
  };
}

/** สมาชิกเปิด/ปิดต่ออายุอัตโนมัติของตัวเอง (ใช้ memberId จาก session เท่านั้น) */
export async function setMyAutoRenew(session: Session, input: { enabled: false } | { enabled: true; last4: string }): Promise<void> {
  await authorize(session, 'portal.use');
  const db = prismaAs(session);
  const id = session.memberId;
  if (!id || !(await db.member.findUnique({ where: { id } }))) throw new ForbiddenError();
  if (!input.enabled) {
    await db.member.update({ where: { id }, data: { cardBrand: null, cardLast4: null, cardExp: null, autoRenewSince: null } });
    return;
  }
  const card = TEST_CARDS.find(c => c.last4 === input.last4);
  if (!card) throw new Error('NOT_FOUND');
  await db.member.update({ where: { id }, data: { cardBrand: card.brand, cardLast4: card.last4, cardExp: card.exp, autoRenewSince: asDay(today()) } });
}
