import { describe, expect, it } from 'vitest';
import { chargeDueOn, declineReason, monthlyValueSatang, nextRetryOn } from './service';

describe('ตัดบัตรอัตโนมัติ', () => {
  it('ตัดก่อนหมดอายุ 3 วัน', () => {
    expect(chargeDueOn('2026-10-18')).toBe('2026-10-15');
  });
  it('ลองใหม่หลังวันครบกำหนด 1, 3, 5 วัน แล้วหยุด', () => {
    expect(nextRetryOn('2026-10-15', 1)).toBe('2026-10-16');
    expect(nextRetryOn('2026-10-15', 2)).toBe('2026-10-18');
    expect(nextRetryOn('2026-10-15', 3)).toBe('2026-10-20');
    expect(nextRetryOn('2026-10-15', 4)).toBeNull();
  });
  it('บัตรทดสอบ 0002 ถูกปฏิเสธ', () => {
    expect(declineReason('0002')).toMatch(/ปฏิเสธ/);
    expect(declineReason('4242')).toBeNull();
  });
  it('MRR คิดราคาต่อเดือน', () => {
    expect(monthlyValueSatang({ priceSatang: 600_000, months: 6 })).toBe(100_000);
    expect(monthlyValueSatang({ priceSatang: 1_090_000, months: 12 })).toBe(90_833);
  });
});
