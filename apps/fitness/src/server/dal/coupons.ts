import 'server-only';
import { COUPON_REJECT, couponLabel, evaluateCoupon, normalizeCouponCode, REFERRAL, referralCode, type CouponReject, type CouponType } from '@/features/coupons/service';
import type { CouponDto } from '@/features/coupons/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, type CouponRecord, type PaymentRecord, type Store } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';

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
export function resolveCoupon(store: Store, rawCode: string, ctx: { memberId: string | null; packageId: string; kind: PaymentRecord['kind'] }): ResolvedCoupon {
  const code = normalizeCouponCode(rawCode);
  const coupon = store.coupons.find(c => c.code === code);
  const pkg = store.packages.find(p => p.id === ctx.packageId);
  if (!coupon || !pkg) throw new CouponError('not-found');
  const usedByMember = ctx.memberId ? store.payments.filter(p => p.memberId === ctx.memberId && p.couponCode === code).length : 0;
  const decision = evaluateCoupon(coupon, { packageId: pkg.id, priceSatang: pkg.priceSatang, kind: ctx.kind, memberId: ctx.memberId, today: today(), usedByMember });
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
  const store = db();
  const pkg = store.packages.find(p => p.id === input.packageId);
  try {
    const r = resolveCoupon(store, input.code, { memberId, packageId: input.packageId, kind: kindFor(pkg?.kind, memberId === null) });
    const coupon = store.coupons.find(c => c.code === r.code);
    return { ok: true, ...r, label: coupon ? couponLabel(coupon) : r.code };
  } catch (error) {
    if (error instanceof CouponError) return { ok: false, message: COUPON_REJECT[error.reason] };
    throw error;
  }
}

function toDto(store: Store, c: CouponRecord): CouponDto {
  const paid = store.payments.filter(p => p.couponCode === c.code && p.status === 'paid');
  const owner = c.ownerMemberId ? store.members.find(m => m.id === c.ownerMemberId) : undefined;
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
    // คูปองตัวอย่างมียอดสะสมก่อนเริ่มระบบ — ประมาณจากจำนวนครั้งที่ใช้ × ราคาเฉลี่ยรายเดือน
    revenueSatang: paid.reduce((sum, p) => sum + p.amountSatang, 0) + Math.max(0, c.used - paid.length) * (c.type === 'percent' ? 108_000 : 100_000),
    ownerName: owner?.name ?? null,
    renewOnly: c.renewOnly,
    newOnly: c.newOnly,
    packageIds: c.packageIds,
  };
}

export async function listCoupons(session: Session): Promise<CouponDto[]> {
  await authorize(session, 'marketing.manage');
  const store = db();
  const order = { active: 0, exhausted: 1, expired: 2, off: 3 };
  return store.coupons.map(c => toDto(store, c)).sort((a, b) => order[a.state] - order[b.state] || b.used - a.used);
}

export class CouponTakenError extends Error {
  constructor() {
    super('COUPON_TAKEN');
  }
}

export async function createCoupon(session: Session, input: { code: string; description: string; type: CouponType; value: number; packageIds: string[] | null; renewOnly: boolean; newOnly: boolean; limit: number | null; expiresOn: string | null }): Promise<CouponDto> {
  await authorize(session, 'marketing.manage');
  const store = db();
  const code = normalizeCouponCode(input.code);
  if (store.coupons.some(c => c.code === code)) throw new CouponTakenError();
  const record: CouponRecord = { ...input, code, kind: 'promo', used: 0, perMember: 1, active: true, ownerMemberId: null, createdAt: now().toISOString() };
  store.coupons.unshift(record);
  return toDto(store, record);
}

export async function setCouponActive(session: Session, code: string, active: boolean): Promise<void> {
  await authorize(session, 'marketing.manage');
  const c = db().coupons.find(x => x.code === code);
  if (!c) throw new Error('NOT_FOUND');
  c.active = active;
}

/** คูปองดึงกลับเฉพาะคน (ใช้ได้ครั้งเดียว 14 วัน) — ให้จากหน้าติดตามสมาชิก */
export function createWinbackCoupon(store: Store, memberId: string, memberCode: string): CouponRecord {
  const code = `BACK-${memberCode.replace(/\D/g, '').slice(-4)}`;
  const existing = store.coupons.find(c => c.code === code);
  if (existing) return existing;
  const record: CouponRecord = { code, description: 'คูปองดึงกลับเฉพาะคน', type: 'percent', value: 15, kind: 'winback', packageIds: null, renewOnly: true, newOnly: false, limit: 1, used: 0, perMember: 1, expiresOn: null, active: true, ownerMemberId: memberId, createdAt: now().toISOString() };
  store.coupons.push(record);
  return record;
}

/** โค้ดชวนเพื่อนของสมาชิก (สร้างครั้งแรกที่เปิดดู) */
export async function myReferral(session: Session): Promise<{ code: string; friends: number; bonusDays: number; remaining: number }> {
  await authorize(session, 'portal.use');
  const store = db();
  const member = store.members.find(m => m.id === session.memberId);
  if (!member) throw new ForbiddenError();
  const code = referralCode(member.code);
  let coupon = store.coupons.find(c => c.code === code);
  if (!coupon) {
    coupon = { code, description: `ชวนเพื่อนของ ${member.name}`, type: 'baht', value: REFERRAL.friendDiscountSatang, kind: 'referral', packageIds: null, renewOnly: false, newOnly: true, limit: REFERRAL.maxUses, used: 0, perMember: 1, expiresOn: null, active: true, ownerMemberId: member.id, createdAt: now().toISOString() };
    store.coupons.push(coupon);
  }
  const friends = coupon.used;
  return { code, friends, bonusDays: friends * REFERRAL.referrerBonusDays, remaining: Math.max(0, REFERRAL.maxUses - coupon.used) };
}
