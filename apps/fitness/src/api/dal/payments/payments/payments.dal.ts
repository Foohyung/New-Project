import 'server-only';
import { addDays } from '@/api/lib/utils/utils/utils';
import { REFERRAL } from '@/api/services/coupons/coupons/coupons.service';
import { membershipPeriod } from '@/api/services/members/members/members.service';
import { isInstantMethod, receiptNo, type PaymentMethod, type PaymentStatus } from '@/api/services/payments/payments/payments.service';
import type { PaymentDto } from '@/api/types/payments/payments/payments.types';
import type { DateRange } from '@/api/services/shared/shared/shared.date-range';
import { packageDurationLabel } from '@/api/services/packages/packages/packages.service';
import type { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, nextNumber, packagesById, prismaAs, toMember, toPackage, toPayment, transaction, type PackageRecord, type PaymentRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { kindFor, resolveCoupon, type ResolvedCoupon } from '@/api/dal/coupons/coupons/coupons.dal';

/** PromptPay ของร้าน — production ตั้งค่า PROMPTPAY_ID */
export function shopPromptPayId(): string {
  return process.env.PROMPTPAY_ID ?? '0812345678';
}

type PaymentRow = Prisma.PaymentGetPayload<{ include: { member: { select: { name: true; code: true } } } }>;
/** include สำหรับ query รายการชำระที่จะแปลงเป็น DTO */
export const PAYMENT_INCLUDE = { member: { select: { name: true, code: true } } } as const;

export function toPaymentDto(p: PaymentRecord, member: { name: string; code: string } | null, pkg: PackageRecord | undefined): PaymentDto {
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

/** แปลงแถว (ที่ include PAYMENT_INCLUDE) เป็น DTO */
export const paymentDtos = (rows: PaymentRow[], pkgs: Map<string, PackageRecord>): PaymentDto[] => rows.map(r => toPaymentDto(toPayment(r), r.member, pkgs.get(r.packageId)));

async function paymentDto(tx: Tx, id: string): Promise<PaymentDto> {
  const row = await tx.payment.findUniqueOrThrow({ where: { id }, include: PAYMENT_INCLUDE });
  return paymentDtos([row], await packagesById(tx))[0] as PaymentDto;
}

/** ใช้ผลของการชำระ: ต่ออายุสมาชิก หรือเพิ่มครั้ง PT — เรียกครั้งเดียวต่อรายการ (idempotent) */
async function applyPayment(tx: Tx, paymentId: string, date: string): Promise<void> {
  const row = await tx.payment.findUnique({ where: { id: paymentId }, include: { member: true, package: true } });
  if (!row || row.applied) return;
  const member = toMember(row.member);
  const pkg = toPackage(row.package);
  if (pkg.kind === 'pt') {
    await tx.member.update({ where: { id: member.id }, data: { ptSessionsLeft: { increment: pkg.sessions ?? 0 } } });
    await tx.payment.update({ where: { id: paymentId }, data: { applied: true } });
  } else {
    // สมัครใหม่ที่ยังไม่ได้จ่าย วันหมดอายุเป็นเมื่อวาน จึงเริ่มนับวันนี้
    const period = membershipPeriod(pkg, member.expiresOn, date);
    const expiresOn = period ? addDays(period.expiresOn, row.bonusDays) : null;
    await tx.member.update({ where: { id: member.id }, data: { packageId: pkg.id, ...(expiresOn ? { expiresOn: asDay(expiresOn) } : {}) } });
    await tx.payment.update({ where: { id: paymentId }, data: { applied: true, ...(period && expiresOn ? { coverageFrom: asDay(period.startsOn), coverageTo: asDay(expiresOn) } : {}) } });
  }
  // เพื่อนสมัครด้วยโค้ดชวนเพื่อนสำเร็จ → เจ้าของโค้ดได้วันใช้งานเพิ่ม
  const coupon = row.couponCode ? await tx.coupon.findUnique({ where: { code: row.couponCode } }) : null;
  const referrer = coupon?.kind === 'referral' && coupon.ownerMemberId ? await tx.member.findUnique({ where: { id: coupon.ownerMemberId } }) : null;
  if (referrer) await tx.member.update({ where: { id: referrer.id }, data: { expiresOn: asDay(addDays(toMember(referrer).expiresOn, REFERRAL.referrerBonusDays)) } });
  // สมาชิกที่ทีมกำลังติดตาม กลับมาจ่ายแล้ว → ย้ายไป "กลับมาแล้ว"
  await tx.followUp.updateMany({ where: { memberId: member.id, stage: { not: 'won' } }, data: { stage: 'won', note: `ต่ออายุ ${pkg.name}`, updatedAt: now() } });
}

/** สร้างรายการชำระ (เรียกใน transaction ของ DAL อื่น) — เงินสด/บัตรถือว่าชำระทันที ส่วน PromptPay/โอนรอตรวจ */
export async function createPaymentRecord(tx: Tx, input: { memberId: string; packageId: string; kind: PaymentRecord['kind']; method: PaymentMethod; receivedBy: string | null; coupon?: ResolvedCoupon | null; instant?: boolean }): Promise<PaymentRecord> {
  const pkg = await tx.package.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
  const at = now();
  const status: PaymentStatus = (input.instant ?? isInstantMethod(input.method)) ? 'paid' : 'pending';
  const coupon = input.coupon ?? null;
  const row = await tx.payment.create({
    data: {
      receiptNo: receiptNo(await nextNumber(tx, 'receipt'), today()),
      memberId: input.memberId,
      packageId: pkg.id,
      kind: input.kind,
      amountSatang: pkg.priceSatang - (coupon?.discountSatang ?? 0),
      method: input.method,
      status,
      createdAt: at,
      paidAt: status === 'paid' ? at : null,
      receivedBy: status === 'paid' ? input.receivedBy : null,
      listPriceSatang: pkg.priceSatang,
      discountSatang: coupon?.discountSatang ?? 0,
      couponCode: coupon?.code ?? null,
      bonusDays: coupon?.bonusDays ?? 0,
    },
  });
  // จองสิทธิ์คูปองตั้งแต่สร้างรายการ (คืนสิทธิ์เมื่อยกเลิกรายการรอชำระ)
  if (coupon) await tx.coupon.update({ where: { code: coupon.code }, data: { used: { increment: 1 } } });
  if (status === 'paid') await applyPayment(tx, row.id, today());
  return toPayment(await tx.payment.findUniqueOrThrow({ where: { id: row.id } }));
}

export async function listPayments(session: Session, filter: { status?: PaymentStatus; method?: PaymentMethod; range?: DateRange | null } = {}): Promise<PaymentDto[]> {
  await authorize(session, 'payments.view');
  const db = prismaAs(session);
  const [rows, pkgs] = await Promise.all([
    db.payment.findMany({
      where: { status: filter.status, method: filter.method, ...(filter.range ? { createdAt: bangkokSpan(filter.range.from, filter.range.to) } : {}) },
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    packagesById(db),
  ]);
  return paymentDtos(rows, pkgs);
}

export async function paymentSummary(session: Session): Promise<{ todaySatang: number; todayCount: number; review: number; pending: number }> {
  await authorize(session, 'payments.view');
  const db = prismaAs(session);
  const [paidToday, review, pending] = await Promise.all([
    db.payment.aggregate({ where: { status: 'paid', paidAt: bangkokSpan(today()) }, _sum: { amountSatang: true }, _count: true }),
    db.payment.count({ where: { status: 'review' } }),
    db.payment.count({ where: { status: 'pending' } }),
  ]);
  return { todaySatang: paidToday._sum.amountSatang ?? 0, todayCount: paidToday._count, review, pending };
}

/** เจ้าหน้าที่การเงินดูได้ทุกใบ สมาชิกดูได้เฉพาะของตัวเอง (กัน IDOR §10.2) */
export async function getPayment(session: Session, id: string): Promise<PaymentDto | null> {
  const db = prismaAs(session);
  const p = await db.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
  const allowed = p && (can(session, 'payments.view') || (can(session, 'portal.use') && session.memberId === p.memberId));
  return p && allowed ? (paymentDtos([p], await packagesById(db))[0] ?? null) : null;
}

export async function confirmPayment(session: Session, id: string): Promise<PaymentDto> {
  await authorize(session, 'payments.confirm');
  return transaction(session, async tx => {
    const p = await tx.payment.findUnique({ where: { id } });
    if (!p) throw new Error('NOT_FOUND');
    if (p.status !== 'paid') {
      await tx.payment.update({ where: { id }, data: { status: 'paid', paidAt: now(), receivedBy: session.name } });
      await applyPayment(tx, id, today());
    }
    return paymentDto(tx, id);
  });
}

/** สมาชิกแจ้งว่าโอน/สแกนจ่ายแล้ว → รอเจ้าหน้าที่ตรวจสลิป */
export async function submitSlip(session: Session, id: string): Promise<PaymentDto> {
  const db = prismaAs(session);
  const p = await db.payment.findUnique({ where: { id } });
  if (!p) throw new Error('NOT_FOUND');
  const own = can(session, 'portal.use') && session.memberId === p.memberId;
  if (!own && !can(session, 'payments.collect')) throw new ForbiddenError();
  if (p.status === 'pending') await db.payment.update({ where: { id }, data: { status: 'review' } });
  return paymentDto(db, id);
}

/** สมาชิกซื้อแพ็กเกจเอง (ชำระด้วย PromptPay เท่านั้น) */
export async function createSelfPayment(session: Session, packageId: string, couponCode: string | null = null, fromReminder = false): Promise<PaymentDto> {
  await authorize(session, 'portal.use');
  return transaction(session, async tx => {
    const member = session.memberId ? await tx.member.findUnique({ where: { id: session.memberId } }) : null;
    const pkg = await tx.package.findFirst({ where: { id: packageId, active: true } });
    if (!member || !pkg) throw new Error('NOT_FOUND');
    const kind = kindFor(pkg.kind, false);
    const coupon = couponCode ? await resolveCoupon(tx, couponCode, { memberId: member.id, packageId: pkg.id, kind }) : null;
    // ยกเลิกรายการรอชำระเดิมของสมาชิกคนนี้ (คืนสิทธิ์คูปอง) เพื่อไม่ให้มี QR ค้างหลายใบ
    const stale = await tx.payment.findMany({ where: { memberId: member.id, status: 'pending' } });
    for (const old of stale) {
      if (old.couponCode) await tx.coupon.updateMany({ where: { code: old.couponCode, used: { gt: 0 } }, data: { used: { decrement: 1 } } });
    }
    await tx.reminderLog.updateMany({ where: { paymentId: { in: stale.map(p => p.id) } }, data: { paymentId: null } });
    await tx.payment.deleteMany({ where: { id: { in: stale.map(p => p.id) } } });
    const record = await createPaymentRecord(tx, { memberId: member.id, packageId: pkg.id, kind, method: 'promptpay', receivedBy: null, coupon });
    // มาจากลิงก์ในข้อความเตือน → นับเป็นผลของการแจ้งเตือน
    if (fromReminder) {
      const reminder = await tx.reminderLog.findFirst({ where: { memberId: member.id }, orderBy: { sentAt: 'desc' } });
      if (reminder) await tx.reminderLog.update({ where: { id: reminder.id }, data: { clicked: true, paymentId: record.id } });
    }
    return paymentDto(tx, record.id);
  });
}
