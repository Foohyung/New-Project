import 'server-only';
import { addDays } from '@/api/lib/utils/utils/utils';
import { membershipPeriod } from '@/api/services/members/members/members.service';
import { isInstantMethod, type PaymentMethod, type PaymentStatus } from '@/api/services/payments/payments/payments.service';
import type { PaymentDto } from '@/api/types/payments/payments/payments.types';
import type { DateRange } from '@/api/services/shared/shared/shared.date-range';
import { packageDurationLabel } from '@/api/services/packages/packages/packages.service';
import type { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, bangkokStart, dayOf, packagesById, prisma, prismaAs, toMember, toPackage, toPayment, transaction, type PackageRecord, type PaymentRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { kindFor, resolveCoupon, type ResolvedCoupon } from '@/api/dal/coupons/coupons/coupons.dal';
import { nextReceiptNo } from '@/api/dal/payments/payments/payments.receipt-no';
import { activeBranchNames } from '@/api/dal/branches/branches/branches.dal';
import { managedBranches } from '@/api/dal/users/users/users.dal';
import type { PaymentSetup } from '@/api/types/payments/payments/payments.types';

const PAYMENT_METHODS: PaymentMethod[] = ['promptpay', 'card', 'cash', 'transfer'];

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function validPromptPayId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^[\d\s+-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 13 ? digits : null;
}

function defaultPaymentMethods(promptPayId: string | null): PaymentMethod[] {
  return ['cash', 'card', 'transfer', ...(promptPayId ? ['promptpay' as const] : [])];
}

function paymentSetupFromRow(row: {
  paymentMethods: unknown;
  promptPayId: string | null;
  promptPayQrData: string | null;
  promptPayQrContentType: string | null;
} | null, branch: string): PaymentSetup {
  const promptPayId = row?.promptPayQrData ? null : validPromptPayId(row?.promptPayId ?? process.env.PROMPTPAY_ID);
  // v = ลายนิ้วมือของรูป — เปลี่ยนรูปแล้ว URL เปลี่ยน เบราว์เซอร์ไม่แสดงรูปเก่าค้าง
  const promptPayQrUrl = row?.promptPayQrData && row.promptPayQrContentType ? `/api/payment-settings/promptpay-qr?branch=${encodeURIComponent(branch)}&v=${row.promptPayQrData.length.toString(36)}${encodeURIComponent(row.promptPayQrData.slice(-8))}` : null;
  const storedMethods = Array.isArray(row?.paymentMethods) ? row.paymentMethods.filter(isPaymentMethod) : null;
  const methods = storedMethods?.length ? storedMethods : defaultPaymentMethods(promptPayId);
  return {
    methods: methods.filter(method => method !== 'promptpay' || Boolean(promptPayId || promptPayQrUrl)),
    promptPayId,
    promptPayQrUrl,
  };
}

/** วิธีชำระและข้อมูล PromptPay ที่ใช้กับการรับชำระของสาขา */
export async function paymentSetupForBranch(branch: string): Promise<PaymentSetup> {
  const row = await prisma().branchBranding.findUnique({
    where: { branch },
    select: { paymentMethods: true, promptPayId: true, promptPayQrData: true, promptPayQrContentType: true },
  });
  return paymentSetupFromRow(row, branch);
}

export async function paymentSettingsBranches(session: Session): Promise<string[]> {
  await authorize(session, 'payments.configure');
  if (session.role === 'admin') {
    const [active, users] = await Promise.all([
      activeBranchNames(),
      prisma().user.findMany({ distinct: ['branch'], select: { branch: true } }),
    ]);
    return [...new Set([...active, ...users.map(user => user.branch), session.branch])];
  }
  const branches = await managedBranches(session);
  if (session.role !== 'owner' || !branches) throw new ForbiddenError();
  return branches;
}

/** สาขาที่ผู้ใช้ตั้งค่าได้ (admin ทุกสาขา / owner เฉพาะสาขาที่ดูแล) — ไม่ได้ = ForbiddenError */
export async function paymentSettingsBranch(session: Session, requestedBranch?: string): Promise<string> {
  const branch = requestedBranch || session.branch;
  if (session.role === 'admin') {
    const [active, users] = await Promise.all([
      activeBranchNames(),
      prisma().user.findMany({ distinct: ['branch'], select: { branch: true } }),
    ]);
    const known = new Set([...active, ...users.map(user => user.branch), session.branch]);
    if (!known.has(branch)) throw new ForbiddenError();
    return branch;
  }
  const branches = await managedBranches(session);
  if (session.role !== 'owner' || !branches?.includes(branch)) throw new ForbiddenError();
  return branch;
}

/** อ่านการตั้งค่าจากหน้าตั้งค่า · จำกัดเฉพาะ admin และ owner ของสาขาปัจจุบัน */
export async function getPaymentSettings(session: Session, requestedBranch?: string): Promise<PaymentSetup & { hasPromptPayQr: boolean }> {
  await authorize(session, 'payments.configure');
  const branch = await paymentSettingsBranch(session, requestedBranch);
  const row = await prisma().branchBranding.findUnique({
    where: { branch },
    select: { paymentMethods: true, promptPayId: true, promptPayQrData: true, promptPayQrContentType: true },
  });
  return { ...paymentSetupFromRow(row, branch), hasPromptPayQr: Boolean(row?.promptPayQrData && row.promptPayQrContentType) };
}

/** บันทึกภาพ QR หรือส่งคืนข้อมูลให้ route ที่แสดง QR */
export async function getPromptPayQr(session: Session, requestedBranch?: string): Promise<{ data: string; contentType: string } | null> {
  if (!can(session, 'portal.use') && !can(session, 'payments.view') && !can(session, 'payments.collect')) throw new ForbiddenError();
  const branch = requestedBranch && requestedBranch !== session.branch ? await paymentSettingsBranch(session, requestedBranch) : requestedBranch ?? session.branch;
  const row = await prisma().branchBranding.findUnique({
    where: { branch },
    select: { promptPayQrData: true, promptPayQrContentType: true },
  });
  if (!row?.promptPayQrData || !row.promptPayQrContentType) return null;
  return { data: row.promptPayQrData, contentType: row.promptPayQrContentType };
}

/** ตรวจสิทธิ์วิธีชำระใน DAL เพื่อไม่ให้ส่ง method ที่ปิดจาก client ได้ */
export async function assertPaymentMethodEnabled(tx: Tx, branch: string, method: PaymentMethod): Promise<void> {
  const row = await tx.branchBranding.findUnique({
    where: { branch },
    select: { paymentMethods: true, promptPayId: true, promptPayQrData: true, promptPayQrContentType: true },
  });
  if (!paymentSetupFromRow(row, branch).methods.includes(method)) throw new Error('PAYMENT_METHOD_DISABLED');
}

export async function savePaymentSettings(
  session: Session,
  input: { branch?: string; methods: PaymentMethod[]; promptPayMode: 'id' | 'qr'; promptPayId: string; promptPayQr?: { data: string; contentType: string }; removePromptPayQr?: boolean },
): Promise<void> {
  await authorize(session, 'payments.configure');
  const branch = await paymentSettingsBranch(session, input.branch);
  const promptPayId = input.promptPayMode === 'id' ? validPromptPayId(input.promptPayId) : null;
  const db = prisma();
  const current = await db.branchBranding.findUnique({
    where: { branch },
    select: { promptPayQrData: true, promptPayQrContentType: true },
  });
  const hasQr = input.promptPayMode === 'qr' && Boolean(input.promptPayQr || (!input.removePromptPayQr && current?.promptPayQrData && current.promptPayQrContentType));
  if (input.methods.includes('promptpay') && !promptPayId && !hasQr) throw new Error('PROMPTPAY_SETUP_REQUIRED');

  // รูปใหม่แทนที่รูปเดิม · ลบรูป / เปลี่ยนไปใช้เลข = ล้างรูป
  const qrFields = input.promptPayMode === 'id' || (input.removePromptPayQr && !input.promptPayQr)
    ? { promptPayQrData: null, promptPayQrContentType: null }
    : input.promptPayQr
      ? { promptPayQrData: input.promptPayQr.data, promptPayQrContentType: input.promptPayQr.contentType }
      : {};
  const author = { updatedById: session.userId, updatedByName: session.name };
  await db.branchBranding.upsert({
    where: { branch },
    create: {
      branch,
      paymentMethods: input.methods,
      promptPayId,
      ...qrFields,
      createdById: session.userId,
      createdByName: session.name,
      ...author,
    },
    update: { paymentMethods: input.methods, promptPayId, ...qrFields, ...author },
  });
}

/** include สำหรับ query รายการชำระที่จะแปลงเป็น DTO */
export const PAYMENT_INCLUDE = { member: { select: { name: true, code: true } } } as const;
export const PAYMENT_QUERY = { include: PAYMENT_INCLUDE, omit: { slipData: true } } as const;
type PaymentRow = Prisma.PaymentGetPayload<typeof PAYMENT_QUERY>;

export function toPaymentDto(p: PaymentRecord, member: { name: string; code: string } | null, pkg: PackageRecord | undefined, hasSlip = Boolean(p.slipData && p.slipContentType)): PaymentDto {
  return {
    hasSlip,
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
    paymentDate: p.paymentDate,
    packageDuration: pkg ? packageDurationLabel(pkg) : '—',
    coverage: p.coverage,
    receivedBy: p.receivedBy,
    listPriceSatang: p.listPriceSatang,
    discountSatang: p.discountSatang,
    couponCode: p.couponCode,
    bonusDays: p.bonusDays,
  };
}

/** แปลงแถว (ที่ include PAYMENT_QUERY) เป็น DTO */
export const paymentDtos = (rows: PaymentRow[], pkgs: Map<string, PackageRecord>): PaymentDto[] => rows.map(r => toPaymentDto(toPayment(r), r.member, pkgs.get(r.packageId), Boolean(r.slipContentType)));

async function paymentDto(tx: Tx, id: string): Promise<PaymentDto> {
  const row = await tx.payment.findUniqueOrThrow({ where: { id }, ...PAYMENT_QUERY });
  return paymentDtos([row], await packagesById(tx))[0] as PaymentDto;
}

/** ใช้ผลของการชำระ: ต่ออายุสมาชิก หรือเพิ่มครั้ง PT — เรียกครั้งเดียวต่อรายการ (idempotent) */
async function applyPayment(tx: Tx, paymentId: string, date: string): Promise<void> {
  const row = await tx.payment.findUnique({ where: { id: paymentId }, include: { member: true, package: true }, omit: { slipData: true } });
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
  // สมาชิกที่ทีมกำลังติดตาม กลับมาจ่ายแล้ว → ย้ายไป "กลับมาแล้ว"
  await tx.followUp.updateMany({ where: { memberId: member.id, stage: { not: 'won' } }, data: { stage: 'won', note: `ต่ออายุ ${pkg.name}`, updatedAt: now() } });
}

/** สร้างรายการชำระ (เรียกใน transaction ของ DAL อื่น) — เงินสด/บัตรถือว่าชำระทันที ส่วน PromptPay/โอนรอตรวจ */
export async function createPaymentRecord(tx: Tx, input: { branch?: string | null; memberId: string; packageId: string; kind: PaymentRecord['kind']; method: PaymentMethod; receivedBy: string | null; coupon?: ResolvedCoupon | null; instant?: boolean; effectiveStartOn?: string; paymentDate?: string }): Promise<PaymentRecord> {
  const pkg = await tx.package.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
  const at = now();
  const coupon = input.coupon ?? null;
  const amountSatang = pkg.priceSatang - (coupon?.discountSatang ?? 0);
  const status: PaymentStatus = amountSatang === 0 || (input.instant ?? isInstantMethod(input.method)) ? 'paid' : 'pending';
  const row = await tx.payment.create({
    data: {
      receiptNo: await nextReceiptNo(tx, input.branch ?? (await tx.user.findFirst({ where: { memberId: input.memberId }, select: { branch: true } }))?.branch ?? null),
      memberId: input.memberId,
      packageId: pkg.id,
      kind: input.kind,
      amountSatang,
      method: input.method,
      status,
      createdAt: at,
      paidAt: status === 'paid' ? input.paymentDate ? bangkokStart(input.paymentDate) : at : null,
      paymentDate: input.paymentDate ? asDay(input.paymentDate) : null,
      coverageFrom: input.effectiveStartOn && pkg.kind !== 'pt' ? asDay(input.effectiveStartOn) : null,
      receivedBy: status === 'paid' ? amountSatang === 0 ? 'คูปองเต็มจำนวน' : input.receivedBy : null,
      listPriceSatang: pkg.priceSatang,
      discountSatang: coupon?.discountSatang ?? 0,
      couponCode: coupon?.code ?? null,
      bonusDays: coupon?.bonusDays ?? 0,
    },
  });
  // จองสิทธิ์คูปองตั้งแต่สร้างรายการ (คืนสิทธิ์เมื่อยกเลิกรายการรอชำระ)
  if (coupon) await tx.coupon.update({ where: { code: coupon.code }, data: { used: { increment: 1 } } });
  if (status === 'paid') await applyPayment(tx, row.id, input.effectiveStartOn ?? today());
  return toPayment(await tx.payment.findUniqueOrThrow({ where: { id: row.id }, omit: { slipData: true } }));
}

/** ตัวกรองสาขาของหน้าการเงิน (เฉพาะ admin) — สาขาที่เปิดใช้งาน + สาขาที่ยังมีบัญชีผู้ใช้อยู่ */
export async function paymentBranchOptions(session: Session): Promise<string[]> {
  await authorize(session, 'payments.view');
  if (session.role !== 'admin') return [];
  const [active, users] = await Promise.all([activeBranchNames(), prisma().user.findMany({ distinct: ['branch'], select: { branch: true } })]);
  const legacy = users.map(u => u.branch).filter(b => !active.includes(b)).sort((a, b) => a.localeCompare(b, 'th'));
  return [...active, ...legacy];
}

/**
 * รายการชำระเงินที่ session เห็น: นับตามสาขาของคนที่สร้างรายการ (payments.created_by_id → users.branch)
 * admin = ทุกสาขา หรือสาขาที่เลือก · คนอื่น = สาขาของตัวเอง (เจ้าของหลายสาขา = ทุกสาขาที่ดูแล) — ส่ง branch มาก็ไม่มีผล
 */
/**
 * รายการชำระเงินที่ session เห็น: นับตามสาขาของคนที่สร้างรายการ (payments.created_by_id → users.branch)
 * admin = ทุกสาขา (null) หรือสาขาที่เลือก · คนอื่น = สาขาของตัวเอง (เจ้าของหลายสาขา = ทุกสาขาที่ดูแล) — ส่ง branch มาก็ไม่มีผล
 */
async function scopeCreatorIds(session: Session, branch?: string): Promise<string[] | null> {
  const branches = (await managedBranches(session)) ?? (branch ? [branch] : null);
  if (!branches) return null;
  const users = await prisma().user.findMany({ where: { branch: { in: branches } }, select: { id: true } });
  return users.map(u => u.id);
}

async function paymentScope(session: Session, branch?: string): Promise<Prisma.PaymentWhereInput> {
  const ids = await scopeCreatorIds(session, branch);
  return ids ? { createdById: { in: ids } } : {};
}

/** รายการนี้อยู่ในสาขาที่ session เห็นหรือไม่ */
async function inPaymentScope(session: Session, createdById: string | null): Promise<boolean> {
  const ids = await scopeCreatorIds(session);
  return ids === null || (createdById !== null && ids.includes(createdById));
}

export async function listPayments(session: Session, filter: { status?: PaymentStatus; method?: PaymentMethod; range?: DateRange | null; branch?: string } = {}): Promise<PaymentDto[]> {
  await authorize(session, 'payments.view');
  const db = prismaAs(session);
  const scope = await paymentScope(session, filter.branch);
  const [rows, pkgs] = await Promise.all([
    db.payment.findMany({
      where: { ...scope, status: filter.status, method: filter.method, ...(filter.range ? { createdAt: bangkokSpan(filter.range.from, filter.range.to) } : {}) },
      ...PAYMENT_QUERY,
      orderBy: { createdAt: 'desc' },
    }),
    packagesById(db),
  ]);
  return paymentDtos(rows, pkgs);
}

export async function paymentSummary(session: Session, branch?: string): Promise<{ todaySatang: number; todayCount: number; review: number; pending: number }> {
  await authorize(session, 'payments.view');
  const db = prismaAs(session);
  const scope = await paymentScope(session, branch);
  const [paidToday, review, pending] = await Promise.all([
    db.payment.aggregate({ where: { ...scope, status: 'paid', paidAt: bangkokSpan(today()) }, _sum: { amountSatang: true }, _count: true }),
    db.payment.count({ where: { ...scope, status: 'review' } }),
    db.payment.count({ where: { ...scope, status: 'pending' } }),
  ]);
  return { todaySatang: paidToday._sum.amountSatang ?? 0, todayCount: paidToday._count, review, pending };
}

/** เจ้าหน้าที่การเงินดูได้เฉพาะใบของสาขาตัวเอง (admin ทุกสาขา) · สมาชิกดูได้เฉพาะของตัวเอง (กัน IDOR §10.2) */
export async function getPayment(session: Session, id: string): Promise<PaymentDto | null> {
  const db = prismaAs(session);
  const p = await db.payment.findUnique({ where: { id }, ...PAYMENT_QUERY });
  const own = p && can(session, 'portal.use') && session.memberId === p.memberId;
  const allowed = p && (own || (can(session, 'payments.view') && await inPaymentScope(session, p.createdById)));
  if (!p || !allowed) return null;
  const [dto, creator] = await Promise.all([
    packagesById(db).then(pkgs => paymentDtos([p], pkgs)[0]),
    p.createdById ? db.user.findUnique({ where: { id: p.createdById }, select: { branch: true } }) : null,
  ]);
  return dto ? { ...dto, branch: creator?.branch ?? session.branch } : null;
}

export async function confirmPayment(session: Session, id: string): Promise<PaymentDto> {
  await authorize(session, 'payments.confirm');
  return transaction(session, async tx => {
    const p = await tx.payment.findUnique({ where: { id }, omit: { slipData: true } });
    if (!p) throw new Error('NOT_FOUND');
    if (!await inPaymentScope(session, p.createdById)) throw new ForbiddenError();
    if (p.status !== 'paid') {
      await tx.payment.update({ where: { id }, data: { status: 'paid', paidAt: p.paymentDate ? bangkokStart(dayOf(p.paymentDate)) : now(), receivedBy: session.name } });
      await applyPayment(tx, id, p.coverageFrom ? dayOf(p.coverageFrom) : today());
    }
    return paymentDto(tx, id);
  });
}

/** สมาชิกแจ้งว่าโอน/สแกนจ่ายแล้ว → รอเจ้าหน้าที่ตรวจสลิป */
export async function submitSlip(session: Session, id: string, slip?: { data: string; contentType: string }): Promise<PaymentDto> {
  const db = prismaAs(session);
  const p = await db.payment.findUnique({ where: { id }, omit: { slipData: true } });
  if (!p) throw new Error('NOT_FOUND');
  const own = can(session, 'portal.use') && session.memberId === p.memberId;
  if (!own && !can(session, 'payments.collect')) throw new ForbiddenError();
  if (own && !slip) throw new Error('SLIP_REQUIRED');
  if (p.method === 'promptpay' && own && p.status === 'pending') {
    await db.payment.update({ where: { id }, data: { status: 'review', slipData: slip?.data, slipContentType: slip?.contentType } });
  } else if (p.status === 'pending') {
    await db.payment.update({ where: { id }, data: { status: 'review', ...(slip ? { slipData: slip.data, slipContentType: slip.contentType } : {}) } });
  }
  return paymentDto(db, id);
}

export async function getPaymentSlip(session: Session, id: string): Promise<{ data: string; contentType: string } | null> {
  const db = prismaAs(session);
  const p = await db.payment.findUnique({ where: { id }, select: { memberId: true, createdById: true, slipData: true, slipContentType: true } });
  if (!p) return null;
  const own = can(session, 'portal.use') && session.memberId === p.memberId;
  if (!own && !(can(session, 'payments.view') && await inPaymentScope(session, p.createdById))) throw new ForbiddenError();
  return p.slipData && p.slipContentType ? { data: p.slipData, contentType: p.slipContentType } : null;
}

/** สมาชิกซื้อแพ็กเกจเอง (ชำระด้วย PromptPay เท่านั้น) */
export async function createSelfPayment(session: Session, packageId: string, couponCode: string | null = null, fromReminder = false): Promise<PaymentDto> {
  await authorize(session, 'portal.use');
  return transaction(session, async tx => {
    const member = session.memberId ? await tx.member.findUnique({ where: { id: session.memberId } }) : null;
    const pkg = await tx.package.findFirst({ where: { id: packageId, active: true } });
    if (!member || !pkg) throw new Error('NOT_FOUND');
    const kind = kindFor(pkg.kind, false);
    const coupon = couponCode ? await resolveCoupon(tx, couponCode, { memberId: member.id, packageId: pkg.id, kind, selfService: true }) : null;
    // ยกเลิกรายการรอชำระเดิมของสมาชิกคนนี้ (คืนสิทธิ์คูปอง) เพื่อไม่ให้มี QR ค้างหลายใบ
    const stale = await tx.payment.findMany({ where: { memberId: member.id, status: 'pending' }, omit: { slipData: true } });
    for (const old of stale) {
      if (old.couponCode) await tx.coupon.updateMany({ where: { code: old.couponCode, used: { gt: 0 } }, data: { used: { decrement: 1 } } });
    }
    await tx.reminderLog.updateMany({ where: { paymentId: { in: stale.map(p => p.id) } }, data: { paymentId: null } });
    await tx.payment.deleteMany({ where: { id: { in: stale.map(p => p.id) } } });
    await assertPaymentMethodEnabled(tx, session.branch, 'promptpay');
    const record = await createPaymentRecord(tx, { branch: session.branch, memberId: member.id, packageId: pkg.id, kind, method: 'promptpay', receivedBy: null, coupon });
    // มาจากลิงก์ในข้อความเตือน → นับเป็นผลของการแจ้งเตือน
    if (fromReminder) {
      const reminder = await tx.reminderLog.findFirst({ where: { memberId: member.id }, orderBy: { sentAt: 'desc' } });
      if (reminder) await tx.reminderLog.update({ where: { id: reminder.id }, data: { clicked: true, paymentId: record.id } });
    }
    return paymentDto(tx, record.id);
  });
}
