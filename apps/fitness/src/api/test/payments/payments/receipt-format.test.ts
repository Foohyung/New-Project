import { describe, expect, it } from 'vitest';
import { DEFAULT_RECEIPT_FORMAT, formatReceiptNo, receiptFormatError, receiptNo, receiptSequenceReader } from '@/api/services/payments/payments/payments.service';

describe('formatReceiptNo', () => {
  it('รูปแบบเริ่มต้นเหมือนเลขเดิม', () => {
    expect(receiptNo(110, '2026-10-15')).toBe('RC-6910-0110');
    expect(formatReceiptNo(DEFAULT_RECEIPT_FORMAT, 7, '2026-11-03')).toBe('RC-6911-0007');
  });
  it('ตัวแปรครบ + ข้อความไทย', () => {
    expect(formatReceiptNo('ลาดพร้าว/{YYYY}{MM}{DD}/{######}', 42, '2026-11-03')).toBe('ลาดพร้าว/25691103/000042');
    expect(formatReceiptNo('INV{##}', 1234, '2026-01-01')).toBe('INV1234');
  });
});

describe('receiptFormatError', () => {
  it('ใช้ได้', () => {
    expect(receiptFormatError(DEFAULT_RECEIPT_FORMAT)).toBeNull();
    expect(receiptFormatError('BKK-{YYYY}-{#####}')).toBeNull();
  });
  it('ผิด', () => {
    expect(receiptFormatError('')).not.toBeNull();
    expect(receiptFormatError('RC-{YY}')).toMatch('เลขรัน');
    expect(receiptFormatError('{###}-{###}')).toMatch('เลขรัน');
    expect(receiptFormatError('RC-{HH}-{###}')).toMatch('ใช้ได้เฉพาะ');
    expect(receiptFormatError('RC<{###}>')).not.toBeNull();
    expect(receiptFormatError('ABCDEFGHIJKLMNOPQRSTUVWXYZ-{YYYY}-{####}')).toMatch('30');
  });
});

describe('receiptSequenceReader', () => {
  it('อ่านเลขรันของงวดเดียวกันเท่านั้น', () => {
    const { prefix, read } = receiptSequenceReader('BKK-{YY}{MM}-{####}', '2026-11-03');
    expect(prefix).toBe('BKK-6911-');
    expect(read('BKK-6911-0042')).toBe(42);
    expect(read('BKK-6911-12345')).toBe(12345);
    expect(read('BKK-6910-0042')).toBeNull();
    expect(read('BKK-6911-0042-X')).toBeNull();
  });
  it('มีข้อความต่อท้ายเลขรัน และอักขระพิเศษ', () => {
    const { prefix, read } = receiptSequenceReader('A.{###}/{YYYY}', '2026-11-03');
    expect(prefix).toBe('A.');
    expect(read('A.007/2569')).toBe(7);
    expect(read('AX007/2569')).toBeNull();
  });
});
