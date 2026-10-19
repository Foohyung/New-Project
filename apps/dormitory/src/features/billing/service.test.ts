import { describe, expect, it } from 'vitest';
import { collectionRate, computeInvoice, unitsUsed, type Rates } from './service';

const rates: Rates = { electricPerUnit: 800, waterPerUnit: 1800, waterMinimum: 10_000, commonFee: 30_000 };

describe('unitsUsed', () => {
  it('ใช้ผลต่างของมิเตอร์ตามปกติ', () => {
    expect(unitsUsed({ previous: 1200, current: 1382 })).toBe(182);
  });

  it('รองรับมิเตอร์วนรอบหลัง 9999', () => {
    expect(unitsUsed({ previous: 9950, current: 292 })).toBe(342);
  });

  it('ปฏิเสธค่ามิเตอร์ที่ไม่ใช่จำนวนเต็มบวก', () => {
    expect(() => unitsUsed({ previous: -1, current: 5 })).toThrow(RangeError);
    expect(() => unitsUsed({ previous: 1.5, current: 5 })).toThrow(RangeError);
  });
});

describe('computeInvoice', () => {
  it('คำนวณบิลห้อง 304 ตรงกับใบแจ้งหนี้ ฿6,064', () => {
    const invoice = computeInvoice({ rent: 420_000, rates, electric: { previous: 1200, current: 1382 }, water: { previous: 310, current: 316 } });
    expect(invoice.lines.map(l => l.amount)).toEqual([420_000, 145_600, 10_800, 30_000]);
    expect(invoice.total).toBe(606_400);
  });

  it('ค่าน้ำไม่ต่ำกว่าขั้นต่ำ', () => {
    const invoice = computeInvoice({ rent: 380_000, rates, electric: { previous: 0, current: 50 }, water: { previous: 100, current: 102 } });
    const water = invoice.lines.find(l => l.label === 'ค่าน้ำ');
    expect(water?.amount).toBe(10_000);
    expect(water?.detail).toBe('2 หน่วย (ขั้นต่ำ)');
  });
});

describe('collectionRate', () => {
  it('คิดเปอร์เซ็นต์การเก็บเงิน', () => {
    expect(collectionRate(26_431_000, 31_248_000)).toBe(84.6);
    expect(collectionRate(0, 0)).toBe(0);
  });
});
