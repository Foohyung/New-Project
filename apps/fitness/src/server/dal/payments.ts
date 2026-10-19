import 'server-only';
import { addDays, bangkokDate } from '@repo/utils';
import { REFERRAL } from '@/features/coupons/service';
import { membershipPeriod } from '@/features/members/service';
import { isInstantMethod, receiptNo, type PaymentMethod, type PaymentStatus } from '@/features/payments/service';
import type { PaymentDto } from '@/features/payments/types';
import { inRange, type DateRange } from '@/features/shared/date-range';
import { packageDurationLabel } from '@/features/packages/service';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type PaymentRecord, type Store } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';
import { kindFor, resolveCoupon, type ResolvedCoupon } from './coupons';

/** PromptPay ของร้าน (ข้อมูลตัวอย่าง) — production ตั้งค่า PROMPTPAY_ID */
export function shopPromptPayId(): string {
  return process.env.PROMPTPAY_ID ?? '0812345678';
}

export function toPaymentDto(store: Store, p: PaymentRecord): PaymentDto {
  const member = store.members.find(m => m.id === p.memberId);
  const pkg = store.packages.find(x => x.id === p.packageId);
  return {
    id: p.id,
    receiptNo: p.receiptNo,
    memberId: p.memberId,
    memberName: member?.name ?? 'สมาชิกที่ถูกลบ',
    memberCode: member?.code ?? '—',
    packageName: pkg?.name ?? p.packageId,
    kind: p.kind,
    amountSatang: p.amountSatang,
    method: p.method,
    status: p.status,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
    packageDuration: pkg ? packageDurationLabel(pkg) : '—',
    coverage: p.coverage,
    receivedBy: p.receivedBy,
    listPriceSatang: p.listPriceSatang,
    discountSatang: p.discountSatang,
    couponCode: p.couponCode,
    bonusDays: p.bonusDays,
  };
}

/** ใช้ผลของการชำระ: ต่ออายุสมาชิก หรือเพิ่มครั้ง PT — เรียกครั้งเดียวต่อรายการ (idempotent) */
function applyPayment(store: Store, p: PaymentRecord, date: string): void {
  if (p.applied) return;
  const member = store.members.find(m => m.id === p.memberId);
  const pkg = store.packages.find(x => x.id === p.packageId);
  if (!member || !pkg) return;
  if (pkg.kind === 'pt') {
    member.ptSessionsLeft += pkg.sessions ?? 0;
  } else {
    // สมัครใหม่ที่ยังไม่ได้จ่าย วันหมดอายุเป็นเมื่อวาน จึงเริ่มนับวันนี้
    const period = membershipPeriod(pkg, member.expiresOn, date);
    if (period) {
      const expiresOn = addDays(period.expiresOn, p.bonusDays);
      member.expiresOn = expiresOn;
      p.coverage = { from: period.startsOn, to: expiresOn };
    }
    member.packageId = pkg.id;
  }
  p.applied = true;
  // เพื่อนสมัครด้วยโค้ดชวนเพื่อนสำเร็จ → เจ้าของโค้ดได้วันใช้งานเพิ่ม
  const coupon = p.couponCode ? store.coupons.find(c => c.code === p.couponCode) : undefined;
  const referrer = coupon?.kind === 'referral' ? store.members.find(m => m.id === coupon.ownerMemberId) : undefined;
  if (referrer) referrer.expiresOn = addDays(referrer.expiresOn, REFERRAL.referrerBonusDays);
  // สมาชิกที่ทีมกำลังติดตาม กลับมาจ่ายแล้ว → ย้ายไป "กลับมาแล้ว"
  const followUp = store.followUps.find(f => f.memberId === member.id);
  if (followUp && followUp.stage !== 'won') Object.assign(followUp, { stage: 'won', note: `ต่ออายุ ${pkg.name}`, updatedAt: now().toISOString() });
}

/** สร้างรายการชำระ (เรียกจาก DAL สมาชิก) — เงินสด/บัตรถือว่าชำระทันที ส่วน PromptPay/โอนรอตรวจ */
export function createPaymentRecord(store: Store, input: { memberId: string; packageId: string; kind: PaymentRecord['kind']; method: PaymentMethod; receivedBy: string | null; coupon?: ResolvedCoupon | null; instant?: boolean }): PaymentRecord {
  const pkg = store.packages.find(x => x.id === input.packageId);
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
  store.sequence.receipt += 1;
  const at = now().toISOString();
  const status: PaymentStatus = (input.instant ?? isInstantMethod(input.method)) ? 'paid' : 'pending';
  const coupon = input.coupon ?? null;
  const record: PaymentRecord = {
    id: nextId('p'),
    receiptNo: receiptNo(store.sequence.receipt, today()),
    memberId: input.memberId,
    packageId: pkg.id,
    kind: input.kind,
    amountSatang: pkg.priceSatang - (coupon?.discountSatang ?? 0),
    method: input.method,
    status,
    createdAt: at,
    paidAt: status === 'paid' ? at : null,
    applied: false,
    coverage: null,
    receivedBy: status === 'paid' ? input.receivedBy : null,
    listPriceSatang: pkg.priceSatang,
    discountSatang: coupon?.discountSatang ?? 0,
    couponCode: coupon?.code ?? null,
    bonusDays: coupon?.bonusDays ?? 0,
    seeded: false,
  };
  store.payments.push(record);
  // จองสิทธิ์คูปองตั้งแต่สร้างรายการ (คืนสิทธิ์เมื่อยกเลิกรายการรอชำระ)
  const used = coupon ? store.coupons.find(c => c.code === coupon.code) : undefined;
  if (used) used.used += 1;
  if (status === 'paid') applyPayment(store, record, today());
  return record;
}

export async function listPayments(session: Session, filter: { status?: PaymentStatus; method?: PaymentMethod; range?: DateRange | null } = {}): Promise<PaymentDto[]> {
  await authorize(session, 'payments.view');
  const store = db();
  return store.payments
    .filter(p => !filter.status || p.status === filter.status)
    .filter(p => !filter.method || p.method === filter.method)
    .filter(p => inRange(bangkokDate(new Date(p.createdAt)), filter.range ?? null))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => toPaymentDto(store, p));
}

export async function paymentSummary(session: Session): Promise<{ todaySatang: number; todayCount: number; review: number; pending: number }> {
  await authorize(session, 'payments.view');
  const date = today();
  const store = db();
  const paidToday = store.payments.filter(p => p.status === 'paid' && p.paidAt && bangkokDate(new Date(p.paidAt)) === date);
  return {
    todaySatang: paidToday.reduce((sum, p) => sum + p.amountSatang, 0),
    todayCount: paidToday.length,
    review: store.payments.filter(p => p.status === 'review').length,
    pending: store.payments.filter(p => p.status === 'pending').length,
  };
}

/** เจ้าหน้าที่การเงินดูได้ทุกใบ สมาชิกดูได้เฉพาะของตัวเอง (กัน IDOR §10.2) */
export function getPayment(session: Session, id: string): Promise<PaymentDto | null> {
  const store = db();
  const p = store.payments.find(x => x.id === id);
  const allowed = p && (can(session, 'payments.view') || (can(session, 'portal.use') && session.memberId === p.memberId));
  return Promise.resolve(p && allowed ? toPaymentDto(store, p) : null);
}

export async function confirmPayment(session: Session, id: string): Promise<PaymentDto> {
  await authorize(session, 'payments.confirm');
  const store = db();
  const p = store.payments.find(x => x.id === id);
  if (!p) throw new Error('NOT_FOUND');
  if (p.status === 'paid') return toPaymentDto(store, p);
  p.status = 'paid';
  p.paidAt = now().toISOString();
  p.receivedBy = session.name;
  applyPayment(store, p, today());
  return toPaymentDto(store, p);
}

/** สมาชิกแจ้งว่าโอน/สแกนจ่ายแล้ว → รอเจ้าหน้าที่ตรวจสลิป */
export function submitSlip(session: Session, id: string): Promise<PaymentDto> {
  const store = db();
  const p = store.payments.find(x => x.id === id);
  if (!p) return Promise.reject(new Error('NOT_FOUND'));
  const own = can(session, 'portal.use') && session.memberId === p.memberId;
  if (!own && !can(session, 'payments.collect')) return Promise.reject(new ForbiddenError());
  if (p.status === 'pending') p.status = 'review';
  return Promise.resolve(toPaymentDto(store, p));
}

/** สมาชิกซื้อแพ็กเกจเอง (ชำระด้วย PromptPay เท่านั้น) */
export async function createSelfPayment(session: Session, packageId: string, couponCode: string | null = null, fromReminder = false): Promise<PaymentDto> {
  await authorize(session, 'portal.use');
  const store = db();
  const member = store.members.find(m => m.id === session.memberId);
  const pkg = store.packages.find(x => x.id === packageId && x.active);
  if (!member || !pkg) throw new Error('NOT_FOUND');
  // ยกเลิกรายการรอชำระเดิมของสมาชิกคนนี้ เพื่อไม่ให้มี QR ค้างหลายใบ
  const kind = kindFor(pkg.kind, false);
  const coupon = couponCode ? resolveCoupon(store, couponCode, { memberId: member.id, packageId: pkg.id, kind }) : null;
  for (const old of store.payments.filter(p => p.memberId === member.id && p.status === 'pending' && !p.seeded)) {
    const c = old.couponCode ? store.coupons.find(x => x.code === old.couponCode) : undefined;
    if (c) c.used = Math.max(0, c.used - 1);
  }
  store.payments = store.payments.filter(p => !(p.memberId === member.id && p.status === 'pending' && !p.seeded));
  const record = createPaymentRecord(store, { memberId: member.id, packageId: pkg.id, kind, method: 'promptpay', receivedBy: null, coupon });
  // มาจากลิงก์ในข้อความเตือน → นับเป็นผลของการแจ้งเตือน
  const reminder = fromReminder ? store.reminderLogs.filter(r => r.memberId === member.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0] : undefined;
  if (reminder) Object.assign(reminder, { clicked: true, paymentId: record.id });
  return toPaymentDto(store, record);
}
