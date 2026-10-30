import { describe, expect, it } from 'vitest';
import { ContactSchema } from '../contact/schema';
import { monthlyPayment, mortgageSummary } from '../mortgage/service';
import type { HomeDto } from './types';
import { activeFilterCount, filterHomes, pricePerSqm, SearchSchema, searchHref, searchTitle, shortPrice, sortHomes, suggest } from './service';

const base = { type: 'condo', listing: 'sale', market: 'resale', province: 'bkk', area: null, transit: null, bedrooms: 1, bathrooms: 1, areaSqm: 40, badges: [], project: null, updatedAt: '2026-10-01T00:00:00Z' } as const;
const homes = [
  { ...base, slug: 'a', title: 'คอนโดใกล้ BTS อารีย์', location: 'พญาไท', area: 'ari', transit: 'BTS อารีย์ 350 ม.', price: 459_000_000, updatedAt: '2026-10-05T00:00:00Z' },
  { ...base, slug: 'b', title: 'บ้านเดี่ยวมีสวน', location: 'นนทบุรี', type: 'house', province: 'non', bedrooms: 4, bathrooms: 3, areaSqm: 180, price: 790_000_000 },
  { ...base, slug: 'c', title: 'คอนโดเลี้ยงสัตว์ได้', location: 'ทองหล่อ', listing: 'rent', badges: ['pet'], price: 3_200_000, areaSqm: 62 },
] as unknown as HomeDto[];

describe('ตัวกรองหน้าค้นหา', () => {
  it('ทิ้งค่าที่ไม่รู้จักใน URL', () => {
    expect(SearchSchema.parse({ deal: 'buy', type: '<script>', prov: 'bkk', beds: 'abc', pet: 'yes' })).toEqual({ prov: 'bkk' });
  });

  it('กรองตามประเภท ราคา ห้องนอน และคำค้น', () => {
    expect(filterHomes(homes, SearchSchema.parse({ deal: 'sale', type: 'condo' })).map(h => h.slug)).toEqual(['a']);
    expect(filterHomes(homes, SearchSchema.parse({ deal: 'sale', price: 'p3' })).map(h => h.slug)).toEqual(['b']);
    expect(filterHomes(homes, SearchSchema.parse({ beds: '3' })).map(h => h.slug)).toEqual(['b']);
    expect(filterHomes(homes, SearchSchema.parse({ q: 'อารีย์' })).map(h => h.slug)).toEqual(['a']);
  });

  it('ช่วงราคาของการเช่าใช้ค่าเช่าต่อเดือน', () => {
    expect(filterHomes(homes, SearchSchema.parse({ deal: 'rent', price: 'p3' })).map(h => h.slug)).toEqual(['c']);
  });

  it('เลี้ยงสัตว์ได้ / ใกล้รถไฟฟ้า', () => {
    expect(filterHomes(homes, SearchSchema.parse({ pet: '1' })).map(h => h.slug)).toEqual(['c']);
    expect(filterHomes(homes, SearchSchema.parse({ transit: '1' })).map(h => h.slug)).toEqual(['a']);
  });

  it('เรียงตามราคาและวันที่อัปเดต', () => {
    expect(sortHomes(homes, 'price-asc').map(h => h.slug)).toEqual(['c', 'a', 'b']);
    expect(sortHomes(homes, undefined)[0]?.slug).toBe('a');
  });

  it('URL ค้นหาเรียงคีย์คงที่ และไม่ใส่ค่าเริ่มต้น', () => {
    expect(searchHref({ q: 'อารีย์', deal: 'sale', sort: 'latest' })).toBe('/search?deal=sale&q=%E0%B8%AD%E0%B8%B2%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B9%8C');
    expect(searchHref({ deal: 'sale', type: 'condo' }, { type: undefined })).toBe('/search?deal=sale');
  });

  it('หัวข้อและจำนวนตัวกรอง', () => {
    const q = SearchSchema.parse({ deal: 'rent', type: 'condo', area: 'ari', transit: '1', sort: 'area' });
    expect(searchTitle(q)).toBe('เช่าคอนโด อารีย์ ใกล้รถไฟฟ้า');
    expect(activeFilterCount(q)).toBe(3);
  });
});

describe('ราคาและคำแนะนำ', () => {
  it('ราคาต่อ ตร.ม. เฉพาะประกาศขาย และราคาแบบย่อ', () => {
    expect(pricePerSqm({ listing: 'sale', price: 400_000_000, areaSqm: 40 })).toBe(10_000_000);
    expect(pricePerSqm({ listing: 'rent', price: 3_200_000, areaSqm: 62 })).toBeNull();
    expect(shortPrice({ listing: 'sale', price: 459_000_000 })).toBe('฿4.59M');
    expect(shortPrice({ listing: 'rent', price: 3_200_000 })).toBe('฿32K');
  });

  it('คำแนะนำครอบคลุมทำเล สถานี และโครงการ', () => {
    const s = suggest('อารีย์', [{ name: 'The Verve พระราม 9', location: 'ห้วยขวาง' }], 'sale');
    expect(s.map(x => x.group)).toEqual(['ทำเล', 'รถไฟฟ้า']);
    expect(s[0]?.href).toBe('/search?deal=sale&prov=bkk&area=ari');
    expect(suggest('Verve', [{ name: 'The Verve พระราม 9', location: 'ห้วยขวาง' }], 'rent')[0]?.group).toBe('โครงการ');
    expect(suggest('  ', [], 'sale')).toEqual([]);
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
