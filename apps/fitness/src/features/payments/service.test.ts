import { describe, expect, it } from 'vitest';
import { crc16, isInstantMethod, promptPayPayload, receiptNo } from './service';

describe('crc16 (CRC-16/CCITT-FALSE)', () => {
  it('ตรงกับค่ามาตรฐานของข้อความทดสอบ', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('promptPayPayload', () => {
  it('สร้างข้อความ EMVCo แบบระบุยอดเงินจากเบอร์มือถือ', () => {
    const payload = promptPayPayload('081-234-5678', 120_000);
    expect(payload.startsWith('000201010212')).toBe(true);
    expect(payload).toContain('2937' + '0016A000000677010111' + '01130066812345678');
    expect(payload).toContain('5303764');
    expect(payload).toContain('54071200.00');
    expect(payload).toContain('5802TH');
    // 4 ตัวสุดท้ายคือ CRC ของข้อความก่อนหน้าทั้งหมด (รวม 6304)
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });
  it('รองรับเลข 13 หลัก และยอดที่มีสตางค์', () => {
    const payload = promptPayPayload('0105512345678', 9_950);
    expect(payload).toContain('02130105512345678');
    expect(payload).toContain('540599.50');
  });
  it('ปฏิเสธยอดเงินและ PromptPay ID ที่ไม่ถูกต้อง', () => {
    expect(() => promptPayPayload('0812345678', 0)).toThrow(RangeError);
    expect(() => promptPayPayload('0812345678', 12.5)).toThrow(RangeError);
    expect(() => promptPayPayload('12345', 100)).toThrow(RangeError);
  });
});

describe('ใบเสร็จและวิธีชำระ', () => {
  it('เลขใบเสร็จใช้ปี พ.ศ. 2 หลักและเดือน', () => {
    expect(receiptNo(110, '2026-10-15')).toBe('RC-6910-0110');
  });
  it('เงินสด/บัตรยืนยันทันที ส่วน PromptPay/โอนต้องตรวจสลิป', () => {
    expect([isInstantMethod('cash'), isInstantMethod('card'), isInstantMethod('promptpay'), isInstantMethod('transfer')]).toEqual([true, true, false, false]);
  });
});
