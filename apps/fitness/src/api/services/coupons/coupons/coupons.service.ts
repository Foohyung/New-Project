/** คูปองส่วนลด (pure — ทดสอบได้โดยไม่ต้องมี store) · โค้ดชวนเพื่อนปิดไว้ก่อน (kind = referral ยังอยู่ในฐานข้อมูลแต่ใช้ไม่ได้) */

export type CouponType = 'percent' | 'baht' | 'days';
export type CouponTarget = 'membership' | 'product' | 'course';
export const COUPON_TARGETS: readonly CouponTarget[] = ['membership', 'product', 'course'];
export const COUPON_TARGET_LABEL: Record<CouponTarget, string> = {
  membership: 'สมาชิก / แพ็กเกจ (รวม PT และ Day pass)',
  product: 'สินค้า',
  course: 'คอร์ส',
};
/** referral = โค้ดชวนเพื่อน — ปิดใช้งานอยู่ (เก็บไว้ให้ข้อมูลเดิมอ่านได้) */
export type CouponKind = 'promo' | 'referral' | 'winback';

export interface CouponLike {
  code: string;
  type: CouponType;
  /** percent = %, baht = สตางค์, days = จำนวนวันที่แถม */
  value: number;
  kind: CouponKind;
  /** null = ใช้ได้ทุกแพ็กเกจ */
  packageIds: string[] | null;
  /** null/ว่างในข้อมูลเดิม = สมาชิก/แพ็กเกจเท่านั้น */
  appliesTo?: CouponTarget[];
  renewOnly: boolean;
  newOnly: boolean;
  /** null = ไม่จำกัดจำนวนสิทธิ์ */
  limit: number | null;
  used: number;
  perMember: number;
  startsOn: string;
  expiresOn: string | null;
  active: boolean;
  /** สมาชิกที่ได้คูปองดึงกลับ */
  ownerMemberId: string | null;
  /** เงื่อนไขเพิ่มเติม (ข้อความ) */
  terms: string | null;
  /** ต้องเป็นสมาชิกมาแล้วอย่างน้อยกี่วัน — null = ไม่จำกัด */
  minMemberDays: number | null;
  /** หลักฐานที่เคาน์เตอร์ต้องตรวจ — null = ไม่ต้องตรวจ */
  proofRequired: string | null;
}

export interface CouponContext {
  target?: CouponTarget;
  packageId: string;
  priceSatang: number;
  kind: 'signup' | 'renew' | 'pt' | 'daypass' | 'purchase';
  memberId: string | null;
  today: string;
  /** จำนวนครั้งที่สมาชิกคนนี้ใช้โค้ดนี้ไปแล้ว */
  usedByMember: number;
  /** เป็นสมาชิกมาแล้วกี่วัน (สมัครใหม่ = 0) */
  memberDays: number;
  /** สมาชิกใช้เองในแอป (ไม่ผ่านเคาน์เตอร์) */
  selfService: boolean;
  /** เคาน์เตอร์ติ๊กว่าตรวจหลักฐานแล้ว · undefined = ดูตัวอย่าง (ยังไม่ต้องตรวจ) */
  proofChecked?: boolean;
}

export type CouponReject = 'inactive' | 'not-started' | 'expired' | 'exhausted' | 'target' | 'package' | 'renew-only' | 'new-only' | 'already-used' | 'not-owner' | 'member-days' | 'proof-at-counter' | 'proof-missing' | 'days-membership-only';
export type CouponDecision = { ok: true; discountSatang: number; bonusDays: number } | { ok: false; reason: CouponReject };

export const COUPON_REJECT: Record<CouponReject | 'not-found', string> = {
  'not-found': 'ไม่พบโค้ดนี้ ตรวจตัวสะกดอีกครั้ง',
  inactive: 'โค้ดนี้ถูกปิดใช้งานแล้ว',
  'not-started': 'คูปองนี้ยังไม่เริ่มใช้',
  expired: 'โค้ดนี้หมดเขตแล้ว',
  exhausted: 'โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว',
  target: 'โค้ดนี้ใช้กับรายการที่เลือกไม่ได้',
  package: 'โค้ดนี้ใช้กับแพ็กเกจที่เลือกไม่ได้',
  'renew-only': 'โค้ดนี้ใช้ได้เฉพาะการต่ออายุ',
  'new-only': 'โค้ดนี้ใช้ได้เฉพาะสมาชิกใหม่',
  'already-used': 'สมาชิกคนนี้ใช้โค้ดนี้ครบสิทธิ์แล้ว',
  'not-owner': 'โค้ดนี้เป็นคูปองเฉพาะของสมาชิกอีกคน',
  'member-days': 'สมาชิกยังเป็นสมาชิกไม่ครบจำนวนวันที่โค้ดนี้กำหนด',
  'proof-at-counter': 'โค้ดนี้ต้องแสดงหลักฐานที่เคาน์เตอร์ ใช้ในแอปเองไม่ได้',
  'proof-missing': 'ต้องตรวจหลักฐานและติ๊ก "ตรวจหลักฐานแล้ว" ก่อนใช้โค้ดนี้',
  'days-membership-only': 'คูปองแถมวันใช้ได้เฉพาะสมาชิก/แพ็กเกจ',
};

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function evaluateCoupon(c: CouponLike, ctx: CouponContext): CouponDecision {
  const target = ctx.target ?? 'membership';
  const appliesTo = c.appliesTo?.length ? c.appliesTo : ['membership'];
  // โค้ดชวนเพื่อนปิดไว้ก่อน — โค้ดที่เคยสร้างไว้ถือว่าปิดใช้งาน
  if (!c.active || c.kind === 'referral') return { ok: false, reason: 'inactive' };
  if (c.startsOn && ctx.today < c.startsOn) return { ok: false, reason: 'not-started' };
  if (c.expiresOn && ctx.today > c.expiresOn) return { ok: false, reason: 'expired' };
  if (c.limit !== null && c.used >= c.limit) return { ok: false, reason: 'exhausted' };
  if (!appliesTo.includes(target)) return { ok: false, reason: 'target' };
  if (target !== 'membership' && c.type === 'days') return { ok: false, reason: 'days-membership-only' };
  if (target === 'membership' && c.packageIds && !c.packageIds.includes(ctx.packageId)) return { ok: false, reason: 'package' };
  if (c.kind === 'winback' && c.ownerMemberId !== ctx.memberId) return { ok: false, reason: 'not-owner' };
  if (target === 'membership' && c.renewOnly && ctx.kind !== 'renew') return { ok: false, reason: 'renew-only' };
  if (target === 'membership' && c.newOnly && ctx.kind !== 'signup') return { ok: false, reason: 'new-only' };
  if (ctx.usedByMember >= c.perMember) return { ok: false, reason: 'already-used' };
  if (target === 'membership' && c.minMemberDays !== null && ctx.memberDays < c.minMemberDays) return { ok: false, reason: 'member-days' };
  if (c.proofRequired && ctx.selfService) return { ok: false, reason: 'proof-at-counter' };
  if (c.proofRequired && ctx.proofChecked === false) return { ok: false, reason: 'proof-missing' };
  if (c.type === 'days') return { ok: true, discountSatang: 0, bonusDays: c.value };
  const raw = c.type === 'percent' ? Math.round((ctx.priceSatang * c.value) / 100) : c.value;
  return { ok: true, discountSatang: Math.min(raw, ctx.priceSatang), bonusDays: 0 };
}

export function couponLabel(c: Pick<CouponLike, 'type' | 'value'>): string {
  if (c.type === 'percent') return `ลด ${String(c.value)}%`;
  if (c.type === 'days') return `แถม ${String(c.value)} วัน`;
  return `ลด ฿${(c.value / 100).toLocaleString('th-TH')}`;
}

/** เงื่อนไขของโค้ดแบบอ่านง่าย เช่น ["เฉพาะต่ออายุ", "เป็นสมาชิก ≥ 30 วัน", "1 ครั้ง/คน"] */
export function couponConditions(c: Pick<CouponLike, 'renewOnly' | 'newOnly' | 'minMemberDays' | 'perMember' | 'proofRequired'>): string[] {
  return [
    c.renewOnly ? 'เฉพาะต่ออายุ' : null,
    c.newOnly ? 'เฉพาะสมาชิกใหม่' : null,
    c.minMemberDays ? `เป็นสมาชิก ≥ ${String(c.minMemberDays)} วัน` : null,
    `${String(c.perMember)} ครั้ง/คน`,
    c.proofRequired ? `ตรวจหลักฐาน: ${c.proofRequired}` : null,
  ].filter((v): v is string => v !== null);
}

export const COUPON_KIND_LABEL: Record<CouponKind, string> = { promo: 'โปรโมชัน', referral: 'ชวนเพื่อน', winback: 'ดึงกลับ' };
