import { describe, expect, it } from 'vitest';
import { CouponCreateSchema, CouponUpdateSchema } from '@/api/schemas/coupons/coupons/coupons.schema';
import { couponLabel, evaluateCoupon, normalizeCouponCode, type CouponContext, type CouponLike } from '@/api/services/coupons/coupons/coupons.service';

const base: CouponLike = { code: 'RENEW10', type: 'percent', value: 10, kind: 'promo', packageIds: null, renewOnly: false, newOnly: false, limit: 100, used: 0, perMember: 1, startsOn: '2026-10-15', expiresOn: '2026-12-31', active: true, ownerMemberId: null, terms: null, minMemberDays: null, proofRequired: null };
const ctx: CouponContext = { packageId: 'monthly', priceSatang: 120_000, kind: 'renew', memberId: '02', today: '2026-10-15', usedByMember: 0, memberDays: 120, selfService: false };

describe('เงื่อนไขเพิ่มเติม', () => {
  // ตัวอย่างจริง: 1MONTH ลด ฿90 ต้องเป็นสมาชิกอย่างน้อย 30 วัน
  const oneMonth: CouponLike = { ...base, code: '1MONTH', type: 'baht', value: 9_000, minMemberDays: 30 };
  it('ต้องเป็นสมาชิกครบจำนวนวัน (สมัครใหม่ = 0 วัน)', () => {
    expect(evaluateCoupon(oneMonth, { ...ctx, memberDays: 30 })).toEqual({ ok: true, discountSatang: 9_000, bonusDays: 0 });
    expect(evaluateCoupon(oneMonth, { ...ctx, memberDays: 29 })).toEqual({ ok: false, reason: 'member-days' });
    expect(evaluateCoupon(oneMonth, { ...ctx, kind: 'signup', memberId: null, memberDays: 0 })).toEqual({ ok: false, reason: 'member-days' });
  });

  // ตัวอย่างจริง: STUDENT69 ลด 30% เฉพาะแพ็กเกจครึ่งเดือน ตรวจบัตรนักเรียน 1 ครั้ง/คน จำกัด 30 สิทธิ์
  const student: CouponLike = { ...base, code: 'STUDENT69', value: 30, packageIds: ['half-month'], limit: 30, proofRequired: 'บัตรนักเรียน/นักศึกษา หรือบัตรประชาชน (อายุไม่เกิน 20 ปี)' };
  const half = { ...ctx, packageId: 'half-month', priceSatang: 70_000 };
  it('ต้องตรวจหลักฐานที่เคาน์เตอร์ — ดูตัวอย่างได้ แต่บันทึกจริงต้องติ๊กยืนยัน และสมาชิกใช้เองไม่ได้', () => {
    expect(evaluateCoupon(student, half)).toEqual({ ok: true, discountSatang: 21_000, bonusDays: 0 });
    expect(evaluateCoupon(student, { ...half, proofChecked: false })).toEqual({ ok: false, reason: 'proof-missing' });
    expect(evaluateCoupon(student, { ...half, proofChecked: true })).toEqual({ ok: true, discountSatang: 21_000, bonusDays: 0 });
    expect(evaluateCoupon(student, { ...half, selfService: true })).toEqual({ ok: false, reason: 'proof-at-counter' });
    expect(evaluateCoupon(student, ctx)).toEqual({ ok: false, reason: 'package' });
    expect(evaluateCoupon(student, { ...half, usedByMember: 1, proofChecked: true })).toEqual({ ok: false, reason: 'already-used' });
    expect(evaluateCoupon({ ...student, used: 30 }, { ...half, proofChecked: true })).toEqual({ ok: false, reason: 'exhausted' });
  });
});

describe('evaluateCoupon', () => {
  it('ลดเป็นเปอร์เซ็นต์ ปัดเป็นสตางค์', () => {
    expect(evaluateCoupon(base, ctx)).toEqual({ ok: true, discountSatang: 12_000, bonusDays: 0 });
    expect(evaluateCoupon({ ...base, value: 15 }, { ...ctx, priceSatang: 33_333 })).toEqual({ ok: true, discountSatang: 5_000, bonusDays: 0 });
  });
  it('ลดเป็นบาทไม่เกินราคา และแถมวันไม่ลดเงิน', () => {
    expect(evaluateCoupon({ ...base, type: 'baht', value: 50_000 }, { ...ctx, priceSatang: 20_000 })).toEqual({ ok: true, discountSatang: 20_000, bonusDays: 0 });
    expect(evaluateCoupon({ ...base, type: 'days', value: 7 }, ctx)).toEqual({ ok: true, discountSatang: 0, bonusDays: 7 });
  });
  it('จำกัดการใช้คูปองตามประเภทการซื้อ และคูปองแถมวันใช้กับสินค้าไม่ได้', () => {
    const purchase: CouponContext = { ...ctx, target: 'product', packageId: '', kind: 'purchase', priceSatang: 25_000 };
    const productCoupon: CouponLike = { ...base, appliesTo: ['product'], type: 'baht', value: 5_000 };
    expect(evaluateCoupon(productCoupon, purchase)).toEqual({ ok: true, discountSatang: 5_000, bonusDays: 0 });
    expect(evaluateCoupon(productCoupon, ctx)).toEqual({ ok: false, reason: 'target' });
    expect(evaluateCoupon({ ...productCoupon, type: 'days', value: 7 }, purchase)).toEqual({ ok: false, reason: 'days-membership-only' });
    expect(evaluateCoupon({ ...productCoupon, appliesTo: ['product', 'membership'], minMemberDays: 30 }, { ...purchase, memberDays: 0 }).ok).toBe(true);
  });
  it('ปฏิเสธตามเงื่อนไข', () => {
    expect(evaluateCoupon({ ...base, active: false }, ctx)).toEqual({ ok: false, reason: 'inactive' });
    expect(evaluateCoupon({ ...base, expiresOn: '2026-10-14' }, ctx)).toEqual({ ok: false, reason: 'expired' });
    expect(evaluateCoupon({ ...base, used: 100 }, ctx)).toEqual({ ok: false, reason: 'exhausted' });
    expect(evaluateCoupon({ ...base, packageIds: ['3m'] }, ctx)).toEqual({ ok: false, reason: 'package' });
    expect(evaluateCoupon({ ...base, newOnly: true }, ctx)).toEqual({ ok: false, reason: 'new-only' });
    expect(evaluateCoupon({ ...base, renewOnly: true }, { ...ctx, kind: 'signup' })).toEqual({ ok: false, reason: 'renew-only' });
    expect(evaluateCoupon(base, { ...ctx, usedByMember: 1 })).toEqual({ ok: false, reason: 'already-used' });
  });
  it('วันหมดเขตยังใช้ได้ทั้งวัน และไม่จำกัดสิทธิ์เมื่อ limit = null', () => {
    expect(evaluateCoupon({ ...base, expiresOn: '2026-10-15', limit: null, used: 9999 }, ctx).ok).toBe(true);
  });
  it('ยังใช้ไม่ได้ก่อนวันเริ่ม และใช้ได้ตั้งแต่วันเริ่มจนถึงวันสิ้นสุดรวมวันนั้น', () => {
    const scheduled = { ...base, startsOn: '2026-10-16', expiresOn: '2026-10-17' };
    expect(evaluateCoupon(scheduled, ctx)).toEqual({ ok: false, reason: 'not-started' });
    expect(evaluateCoupon(scheduled, { ...ctx, today: '2026-10-16' }).ok).toBe(true);
    expect(evaluateCoupon(scheduled, { ...ctx, today: '2026-10-17' }).ok).toBe(true);
    expect(evaluateCoupon(scheduled, { ...ctx, today: '2026-10-18' })).toEqual({ ok: false, reason: 'expired' });
  });
  it('โค้ดชวนเพื่อนปิดไว้ก่อน (โค้ดเดิมใช้ไม่ได้) และคูปองดึงกลับใช้ได้เฉพาะเจ้าของ', () => {
    expect(evaluateCoupon({ ...base, kind: 'referral', ownerMemberId: '05' }, ctx)).toEqual({ ok: false, reason: 'inactive' });
    expect(evaluateCoupon({ ...base, kind: 'winback', ownerMemberId: '07' }, ctx)).toEqual({ ok: false, reason: 'not-owner' });
    expect(evaluateCoupon({ ...base, kind: 'winback', ownerMemberId: '02' }, ctx).ok).toBe(true);
  });
});

describe('รหัสคูปอง', () => {
  it('ทำให้เป็นตัวใหญ่และตัดช่องว่าง', () => {
    expect(normalizeCouponCode(' renew 10 ')).toBe('RENEW10');
  });
  it('รับโค้ดยาวได้สูงสุด 40 ตัวตามความยาวคอลัมน์ฐานข้อมูล', () => {
    const coupon = { code: 'A'.repeat(40), description: 'โค้ดทดสอบ', type: 'percent', value: '10', packageIds: [], renewOnly: false, newOnly: false, startsOn: '2026-10-15', perMember: '1' };
    expect(CouponCreateSchema.safeParse(coupon).success).toBe(true);
    expect(CouponCreateSchema.safeParse({ ...coupon, code: 'A'.repeat(41) }).success).toBe(false);
  });
  it('ตรวจช่วงวันเริ่มใช้และวันสิ้นสุด', () => {
    const coupon = { code: 'DATES', description: 'ช่วงวัน', type: 'percent', value: '10', packageIds: [], renewOnly: false, newOnly: false, perMember: '1', startsOn: '2026-12-01', expiresOn: '2026-12-31' };
    expect(CouponCreateSchema.safeParse(coupon).success).toBe(true);
    expect(CouponCreateSchema.safeParse({ ...coupon, startsOn: '2027-01-01' }).success).toBe(false);
    expect(CouponCreateSchema.safeParse({ ...coupon, startsOn: '' }).success).toBe(false);
    const editable = { description: coupon.description, type: coupon.type, value: coupon.value, packageIds: coupon.packageIds, renewOnly: coupon.renewOnly, newOnly: coupon.newOnly, perMember: coupon.perMember, startsOn: coupon.startsOn, expiresOn: coupon.expiresOn };
    expect(CouponUpdateSchema.safeParse(editable).success).toBe(true);
    expect(CouponUpdateSchema.safeParse({ ...editable, expiresOn: '2026-11-30' }).success).toBe(false);
  });
  it('ตรวจประเภทการชำระที่คูปองใช้ได้', () => {
    const coupon = { code: 'TARGETS', description: 'ลดค่าสินค้า', type: 'percent', value: '10', packageIds: [], renewOnly: false, newOnly: false, perMember: '1', startsOn: '2026-12-01', appliesTo: ['product'] };
    expect(CouponCreateSchema.safeParse(coupon).success).toBe(true);
    expect(CouponCreateSchema.safeParse({ ...coupon, appliesTo: [] }).success).toBe(false);
    expect(CouponCreateSchema.safeParse({ ...coupon, type: 'days' }).success).toBe(false);
    const legacy = { ...coupon };
    delete (legacy as { appliesTo?: string[] }).appliesTo;
    expect(CouponCreateSchema.safeParse(legacy).success).toBe(true);
  });
  it('ป้ายส่วนลด', () => {
    expect(couponLabel({ type: 'percent', value: 10 })).toBe('ลด 10%');
    expect(couponLabel({ type: 'baht', value: 20_000 })).toBe('ลด ฿200');
    expect(couponLabel({ type: 'days', value: 7 })).toBe('แถม 7 วัน');
  });
});
