import { describe, expect, it } from 'vitest';
import { ContactSchema } from '../contact/schema';
import { monthlyPayment, mortgageSummary } from '../mortgage/service';
import { filterHomes, HomeFilterSchema, toggleTag } from './service';

const homes = [
  { title: 'บ้านเดี่ยวมีสวน', location: 'ราชพฤกษ์, นนทบุรี', price: 790_000_000, tags: ['garden', 'pet'] as const },
  { title: 'ทาวน์โฮมใกล้ BTS', location: 'อารีย์, กรุงเทพฯ', price: 795_000_000, tags: ['transit', 'work'] as const },
  { title: 'คอนโดเลี้ยงสัตว์ได้', location: 'ทองหล่อ, กรุงเทพฯ', price: 560_000_000, tags: ['pet', 'transit'] as const },
];

describe('ตัวกรองไลฟ์สไตล์', () => {
  it('ต้องตรงทุกไลฟ์สไตล์ที่เลือก', () => {
    const f = HomeFilterSchema.parse({ tags: 'pet,transit' });
    expect(filterHomes(homes, f).map(h => h.title)).toEqual(['คอนโดเลี้ยงสัตว์ได้']);
  });

  it('ทิ้งค่าที่ไม่รู้จักใน URL', () => {
    expect(HomeFilterSchema.parse({ tags: 'pet,<script>,garden' }).tags).toEqual(['pet', 'garden']);
  });

  it('กรองตามงบ (บาท) และคำค้น', () => {
    expect(filterHomes(homes, HomeFilterSchema.parse({ max: '6000000' }))).toHaveLength(1);
    expect(filterHomes(homes, HomeFilterSchema.parse({ q: 'อารีย์' }))).toHaveLength(1);
  });

  it('สลับไลฟ์สไตล์โดยเรียงลำดับคงที่', () => {
    expect(toggleTag(['pet'], 'transit')).toBe('transit,pet');
    expect(toggleTag(['transit', 'pet'], 'pet')).toBe('transit');
  });
});

describe('ค่าผ่อน', () => {
  it('ราคา 7.9 ล้าน ดาวน์ 10% 30 ปี 3.5% ผ่อนประมาณ ฿31,927/เดือน', () => {
    expect(monthlyPayment({ price: 790_000_000, downPct: 10, years: 30, ratePct: 3.5 })).toBe(3_192_708);
  });

  it('ดอกเบี้ย 0% หารเท่ากันทุกเดือน', () => {
    expect(monthlyPayment({ price: 120_000_000, downPct: 0, years: 10, ratePct: 0 })).toBe(1_000_000);
  });

  it('สรุปวงเงินกู้และรายได้ที่ควรมี', () => {
    const s = mortgageSummary({ price: 790_000_000, downPct: 10, years: 30, ratePct: 3.5 });
    expect(s.loan).toBe(711_000_000);
    expect(s.suggestedIncome).toBe(Math.round(s.monthly / 0.4));
  });

  it('ปฏิเสธเงื่อนไขที่ไม่ถูกต้อง', () => {
    expect(() => monthlyPayment({ price: 100, downPct: 120, years: 30, ratePct: 3 })).toThrow(RangeError);
  });
});

describe('ฟอร์มติดต่อ', () => {
  const valid = { homeSlug: 'house-ratchaphruek', name: 'สมชาย', phone: '081-234-5678', consent: 'on' };

  it('รับข้อมูลที่ถูกต้องและจัดรูปแบบเบอร์', () => {
    expect(ContactSchema.parse(valid).phone).toBe('0812345678');
  });

  it('ต้องยินยอมก่อนส่ง (PDPA)', () => {
    expect(ContactSchema.safeParse({ ...valid, consent: undefined }).success).toBe(false);
  });

  it('ปฏิเสธเบอร์ที่ไม่ใช่มือถือและ bot ที่กรอก honeypot', () => {
    expect(ContactSchema.safeParse({ ...valid, phone: '02-123-4567' }).success).toBe(false);
    expect(ContactSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
  });
});
