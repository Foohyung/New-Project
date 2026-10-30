/** คูปองส่วนลดและโค้ดชวนเพื่อน (pure — ทดสอบได้โดยไม่ต้องมี store) */

export type CouponType = 'percent' | 'baht' | 'days';
export type CouponKind = 'promo' | 'referral' | 'winback';

export interface CouponLike {
  code: string;
  type: CouponType;
  /** percent = %, baht = สตางค์, days = จำนวนวันที่แถม */
  value: number;
  kind: CouponKind;
  /** null = ใช้ได้ทุกแพ็กเกจ */
  packageIds: string[] | null;
  renewOnly: boolean;
  newOnly: boolean;
  /** null = ไม่จำกัดจำนวนสิทธิ์ */
  limit: number | null;
  used: number;
  perMember: number;
  expiresOn: string | null;
  active: boolean;
  /** เจ้าของโค้ดชวนเพื่อน / สมาชิกที่ได้คูปองดึงกลับ */
  ownerMemberId: string | null;
}

export interface CouponContext {
  packageId: string;
  priceSatang: number;
  kind: 'signup' | 'renew' | 'pt' | 'daypass';
  memberId: string | null;
  today: string;
  /** จำนวนครั้งที่สมาชิกคนนี้ใช้โค้ดนี้ไปแล้ว */
  usedByMember: number;
}

export type CouponReject = 'inactive' | 'expired' | 'exhausted' | 'package' | 'renew-only' | 'new-only' | 'already-used' | 'own-code' | 'not-owner';
export type CouponDecision = { ok: true; discountSatang: number; bonusDays: number } | { ok: false; reason: CouponReject };

export const COUPON_REJECT: Record<CouponReject | 'not-found', string> = {
  'not-found': 'ไม่พบโค้ดนี้ ตรวจตัวสะกดอีกครั้ง',
  inactive: 'โค้ดนี้ถูกปิดใช้งานแล้ว',
  expired: 'โค้ดนี้หมดเขตแล้ว',
  exhausted: 'โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว',
  package: 'โค้ดนี้ใช้กับแพ็กเกจที่เลือกไม่ได้',
  'renew-only': 'โค้ดนี้ใช้ได้เฉพาะการต่ออายุ',
  'new-only': 'โค้ดนี้ใช้ได้เฉพาะสมาชิกใหม่',
  'already-used': 'สมาชิกคนนี้ใช้โค้ดนี้ครบสิทธิ์แล้ว',
  'own-code': 'ใช้โค้ดชวนเพื่อนของตัวเองไม่ได้',
  'not-owner': 'โค้ดนี้เป็นคูปองเฉพาะของสมาชิกอีกคน',
};

export const REFERRAL = {
  /** ส่วนลดของเพื่อนที่สมัครใหม่ */
  friendDiscountSatang: 20_000,
  /** วันที่เจ้าของโค้ดได้เพิ่มเมื่อเพื่อนชำระสำเร็จ */
  referrerBonusDays: 7,
  maxUses: 10,
} as const;

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

/** โค้ดชวนเพื่อนของสมาชิก เช่น FF-001842 → FRIEND-1842 */
export function referralCode(memberCode: string): string {
  return `FRIEND-${memberCode.replace(/\D/g, '').slice(-4)}`;
}

export function evaluateCoupon(c: CouponLike, ctx: CouponContext): CouponDecision {
  if (!c.active) return { ok: false, reason: 'inactive' };
  if (c.expiresOn && ctx.today > c.expiresOn) return { ok: false, reason: 'expired' };
  if (c.limit !== null && c.used >= c.limit) return { ok: false, reason: 'exhausted' };
  if (c.packageIds && !c.packageIds.includes(ctx.packageId)) return { ok: false, reason: 'package' };
  if (c.kind === 'referral' && ctx.memberId !== null && c.ownerMemberId === ctx.memberId) return { ok: false, reason: 'own-code' };
  if (c.kind === 'winback' && c.ownerMemberId !== ctx.memberId) return { ok: false, reason: 'not-owner' };
  if (c.renewOnly && ctx.kind !== 'renew') return { ok: false, reason: 'renew-only' };
  if (c.newOnly && ctx.kind !== 'signup') return { ok: false, reason: 'new-only' };
  if (ctx.usedByMember >= c.perMember) return { ok: false, reason: 'already-used' };
  if (c.type === 'days') return { ok: true, discountSatang: 0, bonusDays: c.value };
  const raw = c.type === 'percent' ? Math.round((ctx.priceSatang * c.value) / 100) : c.value;
  return { ok: true, discountSatang: Math.min(raw, ctx.priceSatang), bonusDays: 0 };
}

export function couponLabel(c: Pick<CouponLike, 'type' | 'value'>): string {
  if (c.type === 'percent') return `ลด ${String(c.value)}%`;
  if (c.type === 'days') return `แถม ${String(c.value)} วัน`;
  return `ลด ฿${(c.value / 100).toLocaleString('th-TH')}`;
}

export const COUPON_KIND_LABEL: Record<CouponKind, string> = { promo: 'โปรโมชัน', referral: 'ชวนเพื่อน', winback: 'ดึงกลับ' };
