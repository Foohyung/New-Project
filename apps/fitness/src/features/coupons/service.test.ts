import { describe, expect, it } from 'vitest';
import { couponLabel, evaluateCoupon, normalizeCouponCode, referralCode, type CouponContext, type CouponLike } from './service';

const base: CouponLike = { code: 'RENEW10', type: 'percent', value: 10, kind: 'promo', packageIds: null, renewOnly: false, newOnly: false, limit: 100, used: 0, perMember: 1, expiresOn: '2026-12-31', active: true, ownerMemberId: null };
const ctx: CouponContext = { packageId: 'monthly', priceSatang: 120_000, kind: 'renew', memberId: '02', today: '2026-10-15', usedByMember: 0 };

describe('evaluateCoupon', () => {
  it('ลดเป็นเปอร์เซ็นต์ ปัดเป็นสตางค์', () => {
    expect(evaluateCoupon(base, ctx)).toEqual({ ok: true, discountSatang: 12_000, bonusDays: 0 });
    expect(evaluateCoupon({ ...base, value: 15 }, { ...ctx, priceSatang: 33_333 })).toEqual({ ok: true, discountSatang: 5_000, bonusDays: 0 });
  });
  it('ลดเป็นบาทไม่เกินราคา และแถมวันไม่ลดเงิน', () => {
    expect(evaluateCoupon({ ...base, type: 'baht', value: 50_000 }, { ...ctx, priceSatang: 20_000 })).toEqual({ ok: true, discountSatang: 20_000, bonusDays: 0 });
    expect(evaluateCoupon({ ...base, type: 'days', value: 7 }, ctx)).toEqual({ ok: true, discountSatang: 0, bonusDays: 7 });
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
  it('โค้ดชวนเพื่อนใช้กับตัวเองไม่ได้ และคูปองดึงกลับใช้ได้เฉพาะเจ้าของ', () => {
    expect(evaluateCoupon({ ...base, kind: 'referral', ownerMemberId: '02' }, ctx)).toEqual({ ok: false, reason: 'own-code' });
    expect(evaluateCoupon({ ...base, kind: 'winback', ownerMemberId: '07' }, ctx)).toEqual({ ok: false, reason: 'not-owner' });
    expect(evaluateCoupon({ ...base, kind: 'winback', ownerMemberId: '02' }, ctx).ok).toBe(true);
  });
});

describe('รหัสคูปอง', () => {
  it('ทำให้เป็นตัวใหญ่และตัดช่องว่าง', () => {
    expect(normalizeCouponCode(' renew 10 ')).toBe('RENEW10');
  });
  it('โค้ดชวนเพื่อนจากรหัสสมาชิก', () => {
    expect(referralCode('FF-001842')).toBe('FRIEND-1842');
  });
  it('ป้ายส่วนลด', () => {
    expect(couponLabel({ type: 'percent', value: 10 })).toBe('ลด 10%');
    expect(couponLabel({ type: 'baht', value: 20_000 })).toBe('ลด ฿200');
    expect(couponLabel({ type: 'days', value: 7 })).toBe('แถม 7 วัน');
  });
});
