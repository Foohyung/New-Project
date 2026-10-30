import { daysBetween } from '@repo/utils';
import { describe, expect, it } from 'vitest';
import { commissionLabel, countByStatus, expectedCommission, filterUnits, leasesEndingSoon, maskId, nextPropertyCode, parseStockFilter } from './service';
import type { UnitRow } from './types';

const row = (over: Partial<UnitRow> & { name?: string; type?: UnitRow['property']['type'] }): UnitRow => ({
  id: 'u', propertyId: 'p', label: '12A01', bedrooms: 1, areaSqm: 35, landSqWah: null, ownerId: 'o1', salePrice: null, rentPrice: 1_800_000,
  status: 'available', commission: { kind: 'months', months: 1 }, exclusive: false, leaseEnd: null, note: '',
  property: { id: 'p', code: 'BH-101', name: over.name ?? 'คอนโด เดอะ ไลน์ อารีย์', type: over.type ?? 'condo', location: 'พญาไท', province: 'กรุงเทพมหานคร', deed: 'อช.2', agentId: 'ag-1', createdAt: '2026-01-01' },
  owner: { id: 'o1', name: 'คุณสมศักดิ์' },
  ...over,
});

describe('ค่าคอม', () => {
  it('คิดเป็นเปอร์เซ็นต์ของราคาขาย (ปัดเป็นสตางค์)', () => {
    expect(expectedCommission({ kind: 'percent', basisPoints: 300 }, { kind: 'sale', price: 295_000_000 })).toBe(8_850_000);
    expect(expectedCommission({ kind: 'percent', basisPoints: 250 }, { kind: 'sale', price: 333_333 })).toBe(8_333);
  });
  it('คิดเป็นจำนวนเดือนของค่าเช่า และเป็น 0 ถ้าเป็นดีลขาย', () => {
    expect(expectedCommission({ kind: 'months', months: 1 }, { kind: 'rent', price: 3_200_000 })).toBe(3_200_000);
    expect(expectedCommission({ kind: 'months', months: 1 }, { kind: 'sale', price: 100 })).toBe(0);
  });
  it('แบบเหมาจ่ายได้เท่าที่ตกลง', () => {
    expect(expectedCommission({ kind: 'fixed', satang: 5_000_000 }, { kind: 'sale', price: 1 })).toBe(5_000_000);
  });
  it('แสดงข้อความค่าคอม', () => {
    expect(commissionLabel({ kind: 'percent', basisPoints: 300 })).toBe('3% ของราคาขาย');
    expect(commissionLabel({ kind: 'percent', basisPoints: 250 })).toBe('2.50% ของราคาขาย');
    expect(commissionLabel({ kind: 'months', months: 1 })).toBe('ค่าเช่า 1 เดือน');
  });
});

describe('ตัวกรองสต็อก', () => {
  const rows = [row({ id: 'a' }), row({ id: 'b', status: 'rented', type: 'shophouse', name: 'อาคาร ริเวอร์ไลฟ์' }), row({ id: 'c', status: 'reserved' })];
  it('ตัดค่าที่ไม่รู้จักออกจาก query', () => {
    expect(parseStockFilter({ status: 'hacked', type: 'condo', q: '  ไลน์ ' })).toEqual({ status: undefined, type: 'condo', q: 'ไลน์' });
  });
  it('กรองตามสถานะ ประเภท และคำค้น', () => {
    expect(filterUnits(rows, { status: 'rented' }).map(r => r.id)).toEqual(['b']);
    expect(filterUnits(rows, { type: 'condo' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterUnits(rows, { q: 'ริเวอร์' }).map(r => r.id)).toEqual(['b']);
  });
  it('นับจำนวนตามสถานะครบทุกสถานะ', () => {
    expect(countByStatus(rows)).toEqual({ available: 1, reserved: 1, negotiating: 0, rented: 1, sold: 0 });
  });
  it('หาสัญญาเช่าที่ใกล้หมด', () => {
    const list = [row({ id: 'x', leaseEnd: '2026-12-01' }), row({ id: 'y', leaseEnd: '2026-11-01' }), row({ id: 'z', leaseEnd: '2027-06-01' }), row({ id: 'old', leaseEnd: '2026-01-01' })];
    expect(leasesEndingSoon(list, '2026-10-24', 60, daysBetween).map(r => r.id)).toEqual(['y', 'x']);
  });
});

describe('อื่น ๆ', () => {
  it('ซ่อนเลขบัตรเหลือ 4 ตัวท้าย', () => {
    expect(maskId('3-1012-34567-89-1')).toBe('•••••••••7891');
    expect(maskId('12')).toBe('••••');
  });
  it('สร้างรหัสทรัพย์ถัดไป', () => {
    expect(nextPropertyCode(['BH-101', 'BH-105', 'X-9'])).toBe('BH-106');
    expect(nextPropertyCode([])).toBe('BH-101');
  });
});
