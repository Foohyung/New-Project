import { describe, expect, it } from 'vitest';
import { formatBaht, multiplySatang, sumSatang, toSatang } from './money';

describe('money', () => {
  it('แปลงบาทเป็นสตางค์โดยไม่มีปัญหาทศนิยม', () => {
    expect(toSatang(0.1 + 0.2)).toBe(30);
    expect(toSatang(1234.5)).toBe(123450);
  });

  it('รวมเงินเป็นสตางค์', () => {
    expect(sumSatang([420000, 145600, 10800, 30000])).toBe(606400);
  });

  it('ปฏิเสธจำนวนเงินที่ไม่ใช่จำนวนเต็ม', () => {
    expect(() => sumSatang([10.5])).toThrow(RangeError);
    expect(() => formatBaht(1.5)).toThrow(RangeError);
  });

  it('คูณหน่วยกับราคาต่อหน่วย', () => {
    expect(multiplySatang(800, 182)).toBe(145600);
  });

  it('แสดงผลเป็นเงินบาท', () => {
    expect(formatBaht(606400)).toBe('฿6,064');
    expect(formatBaht(123450, { showSatang: true })).toBe('฿1,234.50');
  });
});
