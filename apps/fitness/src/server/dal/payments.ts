import 'server-only';
import { bangkokDate } from '@repo/utils';
import { membershipPeriod } from '@/features/members/service';
import { isInstantMethod, receiptNo, type PaymentMethod, type PaymentStatus } from '@/features/payments/service';
import type { PaymentDto } from '@/features/payments/types';
import { packageDurationLabel } from '@/features/packages/service';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, nextId, type PaymentRecord, type Store } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';

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
      member.expiresOn = period.expiresOn;
      p.coverage = { from: period.startsOn, to: period.expiresOn };
    }
    member.packageId = pkg.id;
  }
  p.applied = true;
}

/** สร้างรายการชำระ (เรียกจาก DAL สมาชิก) — เงินสด/บัตรถือว่าชำระทันที ส่วน PromptPay/โอนรอตรวจ */
export function createPaymentRecord(store: Store, input: { memberId: string; packageId: string; kind: PaymentRecord['kind']; method: PaymentMethod; receivedBy: string | null }): PaymentRecord {
  const pkg = store.packages.find(x => x.id === input.packageId);
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
  store.sequence.receipt += 1;
  const at = now().toISOString();
  const status: PaymentStatus = isInstantMethod(input.method) ? 'paid' : 'pending';
  const record: PaymentRecord = {
    id: nextId('p'),
    receiptNo: receiptNo(store.sequence.receipt, today()),
    memberId: input.memberId,
    packageId: pkg.id,
    kind: input.kind,
    amountSatang: pkg.priceSatang,
    method: input.method,
    status,
    createdAt: at,
    paidAt: status === 'paid' ? at : null,
    applied: false,
    coverage: null,
    receivedBy: status === 'paid' ? input.receivedBy : null,
    seeded: false,
  };
  store.payments.push(record);
  if (status === 'paid') applyPayment(store, record, today());
  return record;
}

export async function listPayments(session: Session, filter: { status?: PaymentStatus; method?: PaymentMethod } = {}): Promise<PaymentDto[]> {
  await authorize(session, 'payments.view');
  const store = db();
  return store.payments
    .filter(p => !filter.status || p.status === filter.status)
    .filter(p => !filter.method || p.method === filter.method)
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
export async function createSelfPayment(session: Session, packageId: string): Promise<PaymentDto> {
  await authorize(session, 'portal.use');
  const store = db();
  const member = store.members.find(m => m.id === session.memberId);
  const pkg = store.packages.find(x => x.id === packageId && x.active);
  if (!member || !pkg) throw new Error('NOT_FOUND');
  // ยกเลิกรายการรอชำระเดิมของสมาชิกคนนี้ เพื่อไม่ให้มี QR ค้างหลายใบ
  store.payments = store.payments.filter(p => !(p.memberId === member.id && p.status === 'pending' && !p.seeded));
  const kind = pkg.kind === 'pt' ? 'pt' : pkg.kind === 'daypass' ? 'daypass' : 'renew';
  return toPaymentDto(store, createPaymentRecord(store, { memberId: member.id, packageId: pkg.id, kind, method: 'promptpay', receivedBy: null }));
}
