import 'server-only';
import { addDays } from '@repo/utils';
import { isFrozenOn } from '@/features/members/service';
import { chargeDueOn, declineReason, monthlyValueSatang, nextRetryOn, TEST_CARDS } from '@/features/subscriptions/service';
import type { MyAutoRenewDto, SubscriptionOverviewDto } from '@/features/subscriptions/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type ChargeRecord, type MemberRecord, type Store } from '../db';
import { authorize, ForbiddenError } from '../rbac';
import { createPaymentRecord } from './payments';

const AUTO = 'ตัดบัตรอัตโนมัติ';
const cardLabel = (m: MemberRecord) => (m.autoRenew ? `${m.autoRenew.card.brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${m.autoRenew.card.last4}` : '—');
/** แนวโน้ม MRR ย้อนหลัง (ข้อมูลตัวอย่าง: สัดส่วนเทียบเดือนปัจจุบัน) */
const TREND = [['พ.ค.', 0.58], ['มิ.ย.', 0.64], ['ก.ค.', 0.7], ['ส.ค.', 0.78], ['ก.ย.', 0.88], ['ต.ค.', 1]] as const;

function subscribers(store: Store): MemberRecord[] {
  return store.members.filter(m => m.autoRenew && store.packages.find(p => p.id === m.packageId)?.kind === 'time');
}

export async function getSubscriptionOverview(session: Session): Promise<SubscriptionOverviewDto> {
  await authorize(session, 'payments.view');
  const store = db();
  const date = today();
  const subs = subscribers(store);
  const mrr = subs.reduce((sum, m) => sum + monthlyValueSatang(store.packages.find(p => p.id === m.packageId) ?? { priceSatang: 0 }), 0);
  const timeMembers = store.members.filter(m => store.packages.find(p => p.id === m.packageId)?.kind === 'time').length;
  const name = (id: string) => store.members.find(m => m.id === id)?.name ?? '—';
  return {
    subscribers: subs.length,
    sharePct: timeMembers ? Math.round((subs.length / timeMembers) * 100) : 0,
    mrrSatang: mrr,
    mrrTrend: TREND.map(([month, ratio]) => ({ month, satang: Math.round(mrr * ratio) })),
    failing: store.charges.filter(c => c.status === 'retrying').length,
    upcoming: subs
      .map(m => ({ m, dueOn: chargeDueOn(m.expiresOn), pkg: store.packages.find(p => p.id === m.packageId) }))
      .filter(({ m, dueOn }) => dueOn >= date && dueOn <= addDays(date, 7) && !store.charges.some(c => c.memberId === m.id && c.dueOn === dueOn))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map(({ m, dueOn, pkg }) => ({ memberId: m.id, name: m.name, packageName: pkg?.name ?? '', amountSatang: pkg?.priceSatang ?? 0, dueOn, card: cardLabel(m) })),
    problems: store.charges
      .filter((c): c is ChargeRecord & { status: 'retrying' | 'failed' } => c.status !== 'paid')
      .map(c => ({ chargeId: c.id, memberId: c.memberId, name: name(c.memberId), amountSatang: c.amountSatang, reason: c.attempts.at(-1)?.reason ?? '', attempts: c.attempts.map(a => ({ on: a.on, ok: a.ok })), nextRetryOn: c.status === 'retrying' ? nextRetryOn(c.dueOn, c.attempts.length) : null, status: c.status })),
    recent: store.charges.filter(c => c.status === 'paid').map(c => ({ memberId: c.memberId, name: name(c.memberId), amountSatang: c.amountSatang, on: c.attempts.at(-1)?.on ?? c.dueOn, paymentId: c.paymentId })),
  };
}

function attempt(store: Store, charge: ChargeRecord, m: MemberRecord, date: string): boolean {
  const reason = m.autoRenew ? declineReason(m.autoRenew.card.last4) : 'ไม่มีบัตรที่บันทึกไว้';
  charge.attempts.push({ on: date, ok: reason === null, reason });
  if (reason === null) {
    const p = createPaymentRecord(store, { memberId: m.id, packageId: charge.packageId, kind: 'renew', method: 'card', receivedBy: AUTO, instant: true });
    charge.status = 'paid';
    charge.paymentId = p.id;
    return true;
  }
  charge.status = nextRetryOn(charge.dueOn, charge.attempts.filter(a => !a.ok).length) ? 'retrying' : 'failed';
  return false;
}

/** รอบตัดบัตรประจำวัน (ระยะที่ 2 เป็น cron job + webhook จาก payment gateway) */
export async function runBilling(session: Session): Promise<{ charged: number; failed: number }> {
  await authorize(session, 'payments.confirm');
  const store = db();
  const date = today();
  let charged = 0;
  let failed = 0;
  const tally = (ok: boolean) => {
    if (ok) charged++;
    else failed++;
  };
  // ลองใหม่รายการที่ตัดไม่ผ่านและถึงกำหนด
  for (const c of store.charges.filter(x => x.status === 'retrying')) {
    const retryOn = nextRetryOn(c.dueOn, c.attempts.filter(a => !a.ok).length);
    const m = store.members.find(x => x.id === c.memberId);
    if (m && retryOn && retryOn <= date && !c.attempts.some(a => a.on === date)) tally(attempt(store, c, m, date));
  }
  // รอบใหม่ที่ถึงกำหนดวันนี้
  for (const m of subscribers(store)) {
    if (isFrozenOn(m.freeze, date)) continue;
    const dueOn = chargeDueOn(m.expiresOn);
    if (dueOn > date || store.charges.some(c => c.memberId === m.id && c.dueOn === dueOn)) continue;
    const pkg = store.packages.find(p => p.id === m.packageId);
    if (!pkg) continue;
    const charge: ChargeRecord = { id: nextId('ch'), memberId: m.id, packageId: pkg.id, amountSatang: pkg.priceSatang, dueOn, attempts: [], status: 'retrying', paymentId: null };
    store.charges.push(charge);
    tally(attempt(store, charge, m, date));
  }
  return { charged, failed };
}

/** ตัดไม่ผ่าน → สร้างรายการ PromptPay ให้สมาชิกจ่ายเอง */
export async function sendPayLinkForCharge(session: Session, chargeId: string): Promise<string> {
  await authorize(session, 'payments.collect');
  const store = db();
  const c = store.charges.find(x => x.id === chargeId);
  if (!c || c.status === 'paid') throw new Error('NOT_FOUND');
  const p = createPaymentRecord(store, { memberId: c.memberId, packageId: c.packageId, kind: 'renew', method: 'promptpay', receivedBy: null });
  store.reminderLogs.push({ id: nextId('r'), memberId: c.memberId, roundId: 'manual', channels: ['line', 'sms'], sentAt: now().toISOString(), clicked: false, paymentId: p.id });
  c.status = 'failed';
  return p.id;
}

export async function getMyAutoRenew(session: Session): Promise<MyAutoRenewDto> {
  await authorize(session, 'portal.use');
  const store = db();
  const m = store.members.find(x => x.id === session.memberId);
  if (!m) throw new ForbiddenError();
  const pkg = store.packages.find(p => p.id === m.packageId);
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
  const store = db();
  const m = store.members.find(x => x.id === session.memberId);
  if (!m) throw new ForbiddenError();
  if (!input.enabled) {
    m.autoRenew = null;
    return;
  }
  const card = TEST_CARDS.find(c => c.last4 === input.last4);
  if (!card) throw new Error('NOT_FOUND');
  m.autoRenew = { card: { brand: card.brand, last4: card.last4, exp: card.exp }, since: today() };
}
