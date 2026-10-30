import 'server-only';
import { COUPON_REJECT, couponLabel, evaluateCoupon, normalizeCouponCode, REFERRAL, referralCode, type CouponReject, type CouponType } from '@/api/services/coupons/coupons/coupons.service';
import type { CouponDto } from '@/api/types/coupons/coupons/coupons.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDayOrNull, prismaAs, toCoupon, type CouponRecord, type PaymentRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';

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

/** ตรวจโค้ดกับแพ็กเกจ/สมาชิก แล้วคืนส่วนลด — ใช้ทั้งตอนดูตัวอย่างและตอนสร้างรายการชำระจริง */
export async function resolveCoupon(tx: Tx, rawCode: string, ctx: { memberId: string | null; packageId: string; kind: PaymentRecord['kind'] }): Promise<ResolvedCoupon> {
  const code = normalizeCouponCode(rawCode);
  const [coupon, pkg] = await Promise.all([tx.coupon.findUnique({ where: { code } }), tx.package.findUnique({ where: { id: ctx.packageId } })]);
  if (!coupon || !pkg) throw new CouponError('not-found');
  const usedByMember = ctx.memberId ? await tx.payment.count({ where: { memberId: ctx.memberId, couponCode: code } }) : 0;
  const decision = evaluateCoupon(toCoupon(coupon), { packageId: pkg.id, priceSatang: pkg.priceSatang, kind: ctx.kind, memberId: ctx.memberId, today: today(), usedByMember });
  if (!decision.ok) throw new CouponError(decision.reason);
  return { code, discountSatang: decision.discountSatang, bonusDays: decision.bonusDays };
}

export function kindFor(pkgKind: string | undefined, isNew: boolean): PaymentRecord['kind'] {
  return pkgKind === 'pt' ? 'pt' : pkgKind === 'daypass' ? 'daypass' : isNew ? 'signup' : 'renew';
}

/** ดูผลคูปองก่อนกดชำระ (เคาน์เตอร์ หรือสมาชิกกับรายการของตัวเอง) */
export async function previewCoupon(session: Session, input: { code: string; packageId: string; memberId: string | null }): Promise<{ ok: true; code: string; discountSatang: number; bonusDays: number; label: string } | { ok: false; message: string }> {
  const self = can(session, 'portal.use');
  if (!self) await authorize(session, 'payments.collect');
  const memberId = self ? (session.memberId ?? null) : input.memberId;
  const db = prismaAs(session);
  const pkg = await db.package.findUnique({ where: { id: input.packageId } });
  try {
    const r = await resolveCoupon(db, input.code, { memberId, packageId: input.packageId, kind: kindFor(pkg?.kind, memberId === null) });
    const coupon = await db.coupon.findUnique({ where: { code: r.code } });
    return { ok: true, ...r, label: coupon ? couponLabel(toCoupon(coupon)) : r.code };
  } catch (error) {
    if (error instanceof CouponError) return { ok: false, message: COUPON_REJECT[error.reason] };
    throw error;
  }
}

function toDto(c: CouponRecord, revenueSatang: number, ownerName: string | null): CouponDto {
  const date = today();
  const state = !c.active ? 'off' : c.expiresOn && date > c.expiresOn ? 'expired' : c.limit !== null && c.used >= c.limit ? 'exhausted' : 'active';
  return {
    code: c.code,
    description: c.description,
    kind: c.kind,
    label: couponLabel(c),
    used: c.used,
    limit: c.limit,
    expiresOn: c.expiresOn,
    state,
    revenueSatang,
    ownerName,
    renewOnly: c.renewOnly,
    newOnly: c.newOnly,
    packageIds: c.packageIds,
  };
}

export async function listCoupons(session: Session): Promise<CouponDto[]> {
  await authorize(session, 'marketing.manage');
  const db = prismaAs(session);
  const [coupons, revenue] = await Promise.all([
    db.coupon.findMany({ include: { ownerMember: { select: { name: true } } } }),
    db.payment.groupBy({ by: ['couponCode'], where: { status: 'paid', couponCode: { not: null } }, _sum: { amountSatang: true } }),
  ]);
  const revenueOf = new Map(revenue.map(r => [r.couponCode, r._sum.amountSatang ?? 0]));
  const order = { active: 0, exhausted: 1, expired: 2, off: 3 };
  return coupons
    .map(c => toDto(toCoupon(c), revenueOf.get(c.code) ?? 0, c.ownerMember?.name ?? null))
    .sort((a, b) => order[a.state] - order[b.state] || b.used - a.used);
}

export class CouponTakenError extends Error {
  constructor() {
    super('COUPON_TAKEN');
  }
}

export async function createCoupon(session: Session, input: { code: string; description: string; type: CouponType; value: number; packageIds: string[] | null; renewOnly: boolean; newOnly: boolean; limit: number | null; expiresOn: string | null }): Promise<CouponDto> {
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
      renewOnly: input.renewOnly,
      newOnly: input.newOnly,
      usageLimit: input.limit,
      expiresOn: asDayOrNull(input.expiresOn),
      createdAt: now(),
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
  const row = await tx.coupon.upsert({
    where: { code },
    update: {},
    create: { code, description: 'คูปองดึงกลับเฉพาะคน', type: 'percent', value: 15, kind: 'winback', renewOnly: true, usageLimit: 1, ownerMemberId: memberId, createdAt: now() },
  });
  return toCoupon(row);
}

/** โค้ดชวนเพื่อนของสมาชิก (สร้างครั้งแรกที่เปิดดู) */
export async function myReferral(session: Session): Promise<{ code: string; friends: number; bonusDays: number; remaining: number }> {
  await authorize(session, 'portal.use');
  const db = prismaAs(session);
  const member = session.memberId ? await db.member.findUnique({ where: { id: session.memberId } }) : null;
  if (!member) throw new ForbiddenError();
  const code = referralCode(member.code);
  const coupon = await db.coupon.upsert({
    where: { code },
    update: {},
    create: { code, description: `ชวนเพื่อนของ ${member.name}`, type: 'baht', value: REFERRAL.friendDiscountSatang, kind: 'referral', newOnly: true, usageLimit: REFERRAL.maxUses, ownerMemberId: member.id, createdAt: now() },
  });
  const friends = coupon.used;
  return { code, friends, bonusDays: friends * REFERRAL.referrerBonusDays, remaining: Math.max(0, REFERRAL.maxUses - coupon.used) };
}
