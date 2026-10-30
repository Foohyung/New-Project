import { describe, expect, it } from 'vitest';
import { bahtText, formatBaht, multiplySatang, sumSatang, toSatang } from '@/api/lib/utils/utils/utils.money';

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

describe('bahtText', () => {
  it('อ่านจำนวนเงินเต็มบาท', () => {
    expect(bahtText(120_000)).toBe('หนึ่งพันสองร้อยบาทถ้วน');
    expect(bahtText(1_090_000)).toBe('หนึ่งหมื่นเก้าร้อยบาทถ้วน');
    expect(bahtText(2_100)).toBe('ยี่สิบเอ็ดบาทถ้วน');
    expect(bahtText(100)).toBe('หนึ่งบาทถ้วน');
    expect(bahtText(1_100)).toBe('สิบเอ็ดบาทถ้วน');
    expect(bahtText(10_100)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน');
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน');
  });
  it('อ่านสตางค์และหลักล้าน', () => {
    expect(bahtText(9_950)).toBe('เก้าสิบเก้าบาทห้าสิบสตางค์');
    expect(bahtText(25)).toBe('ยี่สิบห้าสตางค์');
    expect(bahtText(100_000_100)).toBe('หนึ่งล้านเอ็ดบาทถ้วน');
    expect(bahtText(1_234_567_800)).toBe('สิบสองล้านสามแสนสี่หมื่นห้าพันหกร้อยเจ็ดสิบแปดบาทถ้วน');
  });
});
