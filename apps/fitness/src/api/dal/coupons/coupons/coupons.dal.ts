import 'server-only';
import { COUPON_REJECT, couponConditions, couponLabel, evaluateCoupon, normalizeCouponCode, type CouponReject, type CouponTarget, type CouponType } from '@/api/services/coupons/coupons/coupons.service';
import type { CouponDto } from '@/api/types/coupons/coupons/coupons.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { daysBetween } from '@/api/lib/utils/utils/utils';
import { asDay, asDayOrNull, dayOf, prismaAs, toCoupon, Prisma, type CouponRecord, type PaymentRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can } from '@/api/lib/auth/auth/auth.rbac';

/** โค้ดใช้ไม่ได้ — message เป็นรหัสให้ knownFailure แปลงเป็นข้อความที่ช่องคูปอง */
export class CouponError extends Error {
  constructor(readonly reason: CouponReject | 'not-found') {
    super(`COUPON:${reason}`);
  }
}

export interface ResolvedCoupon {
  code: string;
  discountSatang: number;
  bonusDays: number;
}

async function couponUsageByMember(tx: Tx, code: string, memberId: string): Promise<number> {
  const [payments, sales, enrollments] = await Promise.all([
    tx.payment.count({ where: { memberId, couponCode: code } }),
    tx.sale.count({ where: { couponMemberId: memberId, couponCode: code, voidedAt: null } }),
    tx.courseEnrollment.count({ where: { memberId, couponCode: code, status: { not: 'cancelled' } } }),
  ]);
  return payments + sales + enrollments;
}

async function memberDays(tx: Tx, memberId: string | null, date: string): Promise<number> {
  if (!memberId) return 0;
  const member = await tx.member.findUnique({ where: { id: memberId }, select: { joinedOn: true } });
  return member ? daysBetween(dayOf(member.joinedOn), date) : 0;
}

/**
 * ตรวจโค้ดกับแพ็กเกจ/สมาชิก แล้วคืนส่วนลด — ใช้ทั้งตอนดูตัวอย่างและตอนสร้างรายการชำระจริง
 * selfService = สมาชิกใช้เองในแอป · proofChecked = เคาน์เตอร์ยืนยันว่าตรวจหลักฐานแล้ว (undefined = ดูตัวอย่าง ยังไม่บังคับ)
 */
export async function resolveCoupon(tx: Tx, rawCode: string, ctx: { memberId: string | null; packageId: string; kind: PaymentRecord['kind']; selfService?: boolean; proofChecked?: boolean }): Promise<ResolvedCoupon> {
  const code = normalizeCouponCode(rawCode);
  await tx.$queryRaw`SELECT code FROM coupons WHERE code = ${code} FOR UPDATE`;
  const [coupon, pkg] = await Promise.all([
    tx.coupon.findUnique({ where: { code } }),
    tx.package.findUnique({ where: { id: ctx.packageId } }),
  ]);
  if (!coupon || !pkg) throw new CouponError('not-found');
  const date = today();
  const [usedByMember, days] = await Promise.all([
    ctx.memberId ? couponUsageByMember(tx, code, ctx.memberId) : 0,
    memberDays(tx, ctx.memberId, date),
  ]);
  const decision = evaluateCoupon(toCoupon(coupon), {
    target: 'membership', packageId: pkg.id, priceSatang: pkg.priceSatang, kind: ctx.kind, memberId: ctx.memberId, today: date, usedByMember,
    memberDays: days,
    selfService: ctx.selfService ?? false,
    proofChecked: ctx.proofChecked,
  });
  if (!decision.ok) throw new CouponError(decision.reason);
  return { code, discountSatang: decision.discountSatang, bonusDays: decision.bonusDays };
}

export async function resolvePurchaseCoupon(
  tx: Tx,
  rawCode: string,
  ctx: {
    target: Exclude<CouponTarget, 'membership'>;
    priceSatang: number;
    memberId: string | null;
    selfService: boolean;
    proofChecked?: boolean;
  },
): Promise<ResolvedCoupon> {
  const code = normalizeCouponCode(rawCode);
  await tx.$queryRaw`SELECT code FROM coupons WHERE code = ${code} FOR UPDATE`;
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError('not-found');
  const date = today();
  const [usedByMember, days] = await Promise.all([
    ctx.memberId ? couponUsageByMember(tx, code, ctx.memberId) : 0,
    memberDays(tx, ctx.memberId, date),
  ]);
  const decision = evaluateCoupon(toCoupon(coupon), {
    target: ctx.target,
    packageId: '',
    priceSatang: ctx.priceSatang,
    kind: 'purchase',
    memberId: ctx.memberId,
    today: date,
    usedByMember,
    memberDays: days,
    selfService: ctx.selfService,
    proofChecked: ctx.proofChecked,
  });
  if (!decision.ok) throw new CouponError(decision.reason);
  return { code, discountSatang: decision.discountSatang, bonusDays: decision.bonusDays };
}

export function kindFor(pkgKind: string | undefined, isNew: boolean): PaymentRecord['kind'] {
  return pkgKind === 'pt' ? 'pt' : pkgKind === 'daypass' ? 'daypass' : isNew ? 'signup' : 'renew';
}

/** ดูผลคูปองก่อนกดชำระ (เคาน์เตอร์ หรือสมาชิกกับรายการของตัวเอง) */
export async function previewCoupon(session: Session, input: { code: string; packageId: string; memberId: string | null }): Promise<{ ok: true; code: string; discountSatang: number; bonusDays: number; label: string; terms: string | null; proofRequired: string | null } | { ok: false; message: string }> {
  const self = can(session, 'portal.use');
  if (!self) await authorize(session, 'payments.collect');
  const memberId = self ? (session.memberId ?? null) : input.memberId;
  const db = prismaAs(session);
  const pkg = await db.package.findUnique({ where: { id: input.packageId } });
  try {
    const r = await resolveCoupon(db, input.code, { memberId, packageId: input.packageId, kind: kindFor(pkg?.kind, memberId === null), selfService: self });
    const coupon = await db.coupon.findUnique({ where: { code: r.code } });
    return { ok: true, ...r, label: coupon ? couponLabel(toCoupon(coupon)) : r.code, terms: coupon?.terms ?? null, proofRequired: coupon?.proofRequired ?? null };
  } catch (error) {
    if (error instanceof CouponError) return { ok: false, message: COUPON_REJECT[error.reason] };
    throw error;
  }
}

export type PurchaseCouponPreviewInput =
  | { code: string; target: 'product'; items: { productId: string; qty: number }[] }
  | { code: string; target: 'course'; courseId: string };

export async function previewPurchaseCoupon(session: Session, input: PurchaseCouponPreviewInput): Promise<{ ok: true; code: string; discountSatang: number; bonusDays: number; label: string; terms: string | null; proofRequired: string | null } | { ok: false; message: string }> {
  const selfService = can(session, 'portal.use');
  if (input.target === 'product') {
    await authorize(session, 'sales.use');
  } else {
    await authorize(session, 'portal.use');
    if (!session.memberId) throw new Error('FORBIDDEN');
  }

  const db = prismaAs(session);
  let priceSatang: number;
  if (input.target === 'product') {
    const quantities = new Map<string, number>();
    for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);
    const ids = [...quantities.keys()];
    const products = await db.product.findMany({ where: { id: { in: ids }, branch: session.branch, active: true }, select: { id: true, priceSatang: true } });
    if (products.length !== ids.length) return { ok: false, message: 'มีสินค้าที่ไม่พร้อมขายในตะกร้า รีเฟรชหน้าแล้วลองใหม่' };
    priceSatang = products.reduce((sum, product) => sum + product.priceSatang * (quantities.get(product.id) ?? 0), 0);
  } else {
    const course = await db.course.findFirst({ where: { id: input.courseId, active: true, endsOn: { gte: asDay(today()) } }, select: { priceSatang: true } });
    if (!course) return { ok: false, message: 'ไม่พบคอร์สที่เปิดรับสมัครแล้ว' };
    priceSatang = course.priceSatang;
  }

  try {
    const result = await resolvePurchaseCoupon(db, input.code, {
      target: input.target,
      priceSatang,
      memberId: selfService ? session.memberId ?? null : null,
      selfService,
    });
    const coupon = await db.coupon.findUnique({ where: { code: result.code } });
    return { ok: true, ...result, label: coupon ? couponLabel(toCoupon(coupon)) : result.code, terms: coupon?.terms ?? null, proofRequired: coupon?.proofRequired ?? null };
  } catch (error) {
    if (error instanceof CouponError) return { ok: false, message: COUPON_REJECT[error.reason] };
    throw error;
  }
}

function toDto(c: CouponRecord, revenueSatang: number, ownerName: string | null): CouponDto {
  const date = today();
  const state = !c.active ? 'off' : c.startsOn && date < c.startsOn ? 'scheduled' : c.expiresOn && date > c.expiresOn ? 'expired' : c.limit !== null && c.used >= c.limit ? 'exhausted' : 'active';
  return {
    code: c.code,
    description: c.description,
    kind: c.kind,
    label: couponLabel(c),
    used: c.used,
    limit: c.limit,
    type: c.type,
    value: c.value,
    startsOn: c.startsOn,
    expiresOn: c.expiresOn,
    state,
    revenueSatang,
    ownerName,
    renewOnly: c.renewOnly,
    newOnly: c.newOnly,
    packageIds: c.packageIds,
    appliesTo: c.appliesTo ?? ['membership'],
    perMember: c.perMember,
    terms: c.terms,
    minMemberDays: c.minMemberDays,
    proofRequired: c.proofRequired,
    conditions: couponConditions(c),
  };
}

export async function listCoupons(session: Session): Promise<CouponDto[]> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const [coupons, payments, sales, enrollments] = await Promise.all([
    db.coupon.findMany({ include: { ownerMember: { select: { name: true } } } }),
    db.payment.groupBy({ by: ['couponCode'], where: { status: 'paid', couponCode: { not: null } }, _sum: { amountSatang: true } }),
    db.sale.groupBy({ by: ['couponCode'], where: { couponCode: { not: null }, voidedAt: null }, _sum: { totalSatang: true } }),
    db.courseEnrollment.groupBy({ by: ['couponCode'], where: { status: 'paid', couponCode: { not: null } }, _sum: { amountSatang: true } }),
  ]);
  const revenueOf = new Map<string, number>();
  for (const [code, amount] of [
    ...payments.map(row => [row.couponCode, row._sum.amountSatang ?? 0] as const),
    ...sales.map(row => [row.couponCode, row._sum.totalSatang ?? 0] as const),
    ...enrollments.map(row => [row.couponCode, row._sum.amountSatang ?? 0] as const),
  ]) {
    if (code) revenueOf.set(code, (revenueOf.get(code) ?? 0) + amount);
  }
  const order = { active: 0, scheduled: 1, exhausted: 2, expired: 3, off: 4 };
  return coupons
    .map(c => toDto(toCoupon(c), revenueOf.get(c.code) ?? 0, c.ownerMember?.name ?? null))
    .sort((a, b) => order[a.state] - order[b.state] || b.used - a.used);
}

export class CouponTakenError extends Error {
  constructor() {
    super('COUPON_TAKEN');
  }
}

type CouponEditableFields = {
  description: string;
  type: CouponType;
  value: number;
  packageIds: string[] | null;
  appliesTo?: CouponTarget[];
  renewOnly: boolean;
  newOnly: boolean;
  limit: number | null;
  startsOn: string;
  expiresOn: string | null;
  perMember: number;
  terms: string | null;
  minMemberDays: number | null;
  proofRequired: string | null;
};

export async function createCoupon(session: Session, input: CouponEditableFields & { code: string }): Promise<CouponDto> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const code = normalizeCouponCode(input.code);
  if (await db.coupon.findUnique({ where: { code } })) throw new CouponTakenError();
  const row = await db.coupon.create({
    data: {
      code,
      description: input.description,
      type: input.type,
      value: input.value,
      kind: 'promo',
      packageIds: input.packageIds ?? undefined,
      appliesTo: input.appliesTo ?? ['membership'],
      renewOnly: input.renewOnly,
      newOnly: input.newOnly,
      usageLimit: input.limit,
      perMember: input.perMember,
      terms: input.terms,
      minMemberDays: input.minMemberDays,
      proofRequired: input.proofRequired,
      startsOn: asDay(input.startsOn),
      expiresOn: asDayOrNull(input.expiresOn),
      createdAt: now(),
    },
  });
  return toDto(toCoupon(row), 0, null);
}

export async function updateCoupon(session: Session, code: string, input: CouponEditableFields): Promise<CouponDto> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const existing = await db.coupon.findUnique({ where: { code } });
  if (!existing) throw new Error('NOT_FOUND');
  if (existing.kind !== 'promo') throw new Error('COUPON_NOT_EDITABLE');
  if (input.limit !== null && input.limit < existing.used) throw new Error('COUPON_LIMIT_BELOW_USED');
  const row = await db.coupon.update({
    where: { code },
    data: {
      description: input.description,
      type: input.type,
      value: input.value,
      packageIds: input.packageIds ?? Prisma.JsonNull,
      appliesTo: input.appliesTo ?? ['membership'],
      renewOnly: input.renewOnly,
      newOnly: input.newOnly,
      usageLimit: input.limit,
      perMember: input.perMember,
      terms: input.terms,
      minMemberDays: input.minMemberDays,
      proofRequired: input.proofRequired,
      startsOn: asDay(input.startsOn),
      expiresOn: asDayOrNull(input.expiresOn),
    },
  });
  return toDto(toCoupon(row), 0, null);
}

export async function setCouponActive(session: Session, code: string, active: boolean): Promise<void> {
  await authorize(session, 'marketing.manage');
  const { count } = await prismaAs(session).coupon.updateMany({ where: { code }, data: { active } });
  if (count === 0) throw new Error('NOT_FOUND');
}

/** คูปองดึงกลับเฉพาะคน (ใช้ได้ครั้งเดียว ลด 15%) — ให้จากหน้าติดตามสมาชิก */
export async function createWinbackCoupon(tx: Tx, memberId: string, memberCode: string): Promise<CouponRecord> {
  const code = `BACK-${memberCode.replace(/\D/g, '').slice(-4)}`;
  const createdAt = now();
  const row = await tx.coupon.upsert({
    where: { code },
    update: {},
    create: { code, description: 'คูปองดึงกลับเฉพาะคน', type: 'percent', value: 15, kind: 'winback', renewOnly: true, usageLimit: 1, startsOn: createdAt, ownerMemberId: memberId, createdAt },
  });
  return toCoupon(row);
}
