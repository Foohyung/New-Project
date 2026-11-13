import { describe, expect, it } from 'vitest';
import { chatUrl, checkInSteps, formatPrice, RENT_PRICE } from '@/api/services/landing/landing/landing.service';

describe('chatUrl', () => {
  it('รับเฉพาะลิงก์ https', () => {
    expect(chatUrl('https://m.me/fitflow')).toBe('https://m.me/fitflow');
    expect(chatUrl('  https://lin.ee/abc  ')).toBe('https://lin.ee/abc');
  });
  it('ไม่ตั้ง ว่าง หรือไม่ใช่ https → null (ซ่อนปุ่มแชท)', () => {
    expect(chatUrl(undefined)).toBeNull();
    expect(chatUrl('')).toBeNull();
    expect(chatUrl('http://m.me/fitflow')).toBeNull();
    expect(chatUrl('javascript:alert(1)')).toBeNull();
    expect(chatUrl('not a url')).toBeNull();
  });
});

describe('formatPrice', () => {
  it('ใส่ ฿ และคอมมา', () => {
    expect(formatPrice(RENT_PRICE.month.amount)).toBe('฿990');
    expect(formatPrice(RENT_PRICE.year.amount)).toBe('฿9,900');
    expect(formatPrice(59000)).toBe('฿59,000');
  });
});

describe('checkInSteps', () => {
  it('สมาชิกปกติเดินทีละขั้นจนครบ', () => {
    expect(checkInSteps(0, true)).toEqual(['active', 'wait', 'wait']);
    expect(checkInSteps(2, true)).toEqual(['done', 'done', 'active']);
    expect(checkInSteps(3, true)).toEqual(['done', 'done', 'done']);
  });
  it('หมดอายุ: หลังตรวจแพ็กเกจถูกปฏิเสธ', () => {
    expect(checkInSteps(1, false)).toEqual(['done', 'active', 'wait']);
    expect(checkInSteps(2, false)).toEqual(['done', 'denied', 'denied']);
  });
});
