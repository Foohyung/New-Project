import { describe, expect, it } from 'vitest';
import { CreateBranchSchema, UpdateBranchSchema } from '@/api/schemas/branches/branches/branches.schema';

describe('ฟอร์มสาขา', () => {
  it('ตัดช่องว่าง เก็บเบอร์เป็นตัวเลขล้วน และช่องที่เว้นว่างเป็น null', () => {
    expect(CreateBranchSchema.parse({ name: '  สาขาบางนา ', address: '', phone: '02-123 4567' })).toEqual({ name: 'สาขาบางนา', address: null, phone: '021234567' });
    expect(CreateBranchSchema.parse({ name: 'สาขาหลัก', address: '123 ถ.พหลโยธิน', phone: '' })).toEqual({ name: 'สาขาหลัก', address: '123 ถ.พหลโยธิน', phone: null });
  });

  it('ชื่อสาขาสั้นเกินและเบอร์ที่ไม่ใช่ตัวเลข 9–10 หลักไม่ผ่าน', () => {
    expect(CreateBranchSchema.safeParse({ name: 'ก', address: '', phone: '' }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ name: 'สาขาบางนา', address: '', phone: '12345' }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ name: 'สาขาบางนา', address: '', phone: '08x1234567' }).success).toBe(false);
  });

  it('แก้ไขสาขา: checkbox ไม่ติ๊ก = ปิดใช้งาน', () => {
    expect(UpdateBranchSchema.parse({ id: 'b1', name: 'สาขาบางนา', address: '', phone: '', active: 'on' }).active).toBe(true);
    expect(UpdateBranchSchema.parse({ id: 'b1', name: 'สาขาบางนา', address: '', phone: '' }).active).toBe(false);
  });
});
