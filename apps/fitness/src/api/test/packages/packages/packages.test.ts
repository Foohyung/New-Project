import { describe, expect, it } from 'vitest';
import { PackageCreateSchema, PackageUpdateSchema } from '@/api/schemas/packages/packages/packages.schema';
import { packageDurationSortDays } from '@/api/services/packages/packages/packages.service';

const base = { name: 'รายเดือน 3 เดือน', kind: 'time', duration: '3', price: '2490', description: 'ใช้ยิมไม่จำกัด', active: 'on' };

describe('PackageCreateSchema', () => {
  it('แปลงราคาเป็นสตางค์ ระยะเป็นตัวเลข และ checkbox เป็น boolean', () => {
    expect(PackageCreateSchema.parse(base)).toEqual({ name: 'รายเดือน 3 เดือน', kind: 'time', duration: 3, price: 249_000, description: 'ใช้ยิมไม่จำกัด', active: true });
    expect(PackageCreateSchema.parse({ ...base, active: undefined }).active).toBe(false);
  });

  it('จำกัดระยะตามประเภท', () => {
    expect(PackageCreateSchema.safeParse({ ...base, duration: '36' }).success).toBe(true);
    expect(PackageCreateSchema.safeParse({ ...base, duration: '37' }).success).toBe(false);
    expect(PackageCreateSchema.safeParse({ ...base, kind: 'daypass', duration: '365' }).success).toBe(true);
    expect(PackageCreateSchema.safeParse({ ...base, kind: 'pt', duration: '201' }).success).toBe(false);
  });

  it('ปฏิเสธประเภทที่ไม่รู้จัก ระยะ 0 และราคา 0', () => {
    expect(PackageCreateSchema.safeParse({ ...base, kind: 'year' }).success).toBe(false);
    expect(PackageCreateSchema.safeParse({ ...base, duration: '0' }).success).toBe(false);
    expect(PackageCreateSchema.safeParse({ ...base, duration: '1.5' }).success).toBe(false);
    expect(PackageCreateSchema.safeParse({ ...base, price: '0' }).success).toBe(false);
  });
});

describe('PackageUpdateSchema', () => {
  it('ต้องมี id', () => {
    expect(PackageUpdateSchema.safeParse(base).success).toBe(false);
    expect(PackageUpdateSchema.parse({ ...base, id: 'monthly' }).id).toBe('monthly');
  });
});

describe('package duration ordering', () => {
  it('sorts day passes before month packages and puts PT packages last', () => {
    const packages = [
      { kind: 'time', months: 1 },
      { kind: 'pt', sessions: 10 },
      { kind: 'daypass', days: 15 },
      { kind: 'time', months: 3 },
      { kind: 'daypass', days: 1 },
    ] as const;

    expect([...packages].sort((a, b) => packageDurationSortDays(a) - packageDurationSortDays(b))).toEqual([
      { kind: 'daypass', days: 1 },
      { kind: 'daypass', days: 15 },
      { kind: 'time', months: 1 },
      { kind: 'time', months: 3 },
      { kind: 'pt', sessions: 10 },
    ]);
  });
});
