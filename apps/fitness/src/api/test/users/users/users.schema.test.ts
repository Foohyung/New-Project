import { describe, expect, it } from 'vitest';
import { BrandingSchema } from '@/api/schemas/branding/branding/branding.schema';
import { CreateRoleSchema, UpdateRoleSchema } from '@/api/schemas/roles/roles/roles.schema';
import { CreateUserSchema, UpdateUserSchema } from '@/api/schemas/users/users/users.schema';

const userInput = {
  login: 'staff@example.com',
  password: 'a-secure-password',
  confirmPassword: 'a-secure-password',
  name: 'พนักงานตัวอย่าง',
  nickname: 'ตัวอย่าง',
  role: 'manager',
  branch: 'สาขาหลัก',
};

describe('CreateUserSchema', () => {
  it('รับบทบาท admin และ owner พร้อมรหัสผ่านที่ตรงกัน', () => {
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'admin' }).success).toBe(true);
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'owner' }).success).toBe(true);
  });

  it('บังคับเชื่อมบัญชีสมาชิกและเทรนเนอร์กับข้อมูลจริง', () => {
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'member' }).success).toBe(false);
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'member', memberId: 'm1' }).success).toBe(true);
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'trainer' }).success).toBe(false);
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'trainer', trainerId: 't1' }).success).toBe(true);
  });

  it('ปฏิเสธรหัสผ่านที่ไม่ตรงกันและ role ที่ไม่มีในระบบ', () => {
    expect(CreateUserSchema.safeParse({ ...userInput, confirmPassword: 'different-password' }).success).toBe(false);
    expect(CreateUserSchema.safeParse({ ...userInput, role: 'invalid_role' }).success).toBe(false);
  });

  it('ยอมรับรหัสผ่านตั้งแต่ 1 ถึง 200 ตัวอักษร และปฏิเสธค่าว่างหรือยาวเกิน', () => {
    expect(CreateUserSchema.safeParse({ ...userInput, password: '1', confirmPassword: '1' }).success).toBe(true);
    expect(CreateUserSchema.safeParse({ ...userInput, password: '', confirmPassword: '' }).success).toBe(false);
    const longPassword = 'p'.repeat(201);
    expect(CreateUserSchema.safeParse({ ...userInput, password: longPassword, confirmPassword: longPassword }).success).toBe(false);
  });
});

describe('role definition schemas', () => {
  it('ตรวจรูปแบบ role id, ชื่อ และ permissions', () => {
    expect(CreateRoleSchema.safeParse({ id: 'supervisor', name: 'หัวหน้าสาขา', permissions: ['dashboard.view', 'reports.view'] }).success).toBe(true);
    expect(CreateRoleSchema.safeParse({ id: 'Invalid_Role', name: 'หัวหน้า', permissions: [] }).success).toBe(false);
    expect(CreateRoleSchema.safeParse({ id: 'supervisor', name: 'x', permissions: ['unknown.permission'] }).success).toBe(false);
    expect(UpdateRoleSchema.safeParse({ id: 'manager', name: 'ผู้จัดการสาขา', permissions: ['members.view'] }).success).toBe(true);
  });
});

describe('BrandingSchema', () => {
  it('รับชื่อ Gym แบบ optional และจำกัดความยาว', () => {
    expect(BrandingSchema.safeParse({ gymName: 'FitFlow Fitness Studio', primaryColor: '#aabbcc', logoUrl: '' }).success).toBe(true);
    expect(BrandingSchema.safeParse({ gymName: 'G'.repeat(121), primaryColor: '#aabbcc', logoUrl: '' }).success).toBe(false);
  });

  it('รับสี HEX และ URL HTTPS หรือพาธในเว็บ', () => {
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: 'https://example.com/logo.png' }).success).toBe(true);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: '/images/logo.png' }).success).toBe(true);
  });

  it('ปฏิเสธสีผิดรูปแบบ, URL ไม่ปลอดภัย และ path traversal', () => {
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: 'red', logoUrl: '' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: '//evil.example/logo.png' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: '/../logo.png' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: '/%2e%2e/logo.png' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: '/\\\\evil.example/logo.png' }).success).toBe(false);
    expect(BrandingSchema.safeParse({ gymName: '', primaryColor: '#aabbcc', logoUrl: 'https://user:pass@example.com/logo.png' }).success).toBe(false);
  });
});

describe('active from / to', () => {
  it('เว้นว่าง = ไม่จำกัด · วันสิ้นสุดก่อนวันเริ่มไม่ได้', () => {
    const blank = CreateUserSchema.safeParse({ ...userInput, activeFrom: '', activeTo: '' });
    expect(blank.success && [blank.data.activeFrom, blank.data.activeTo]).toEqual([null, null]);
    expect(CreateUserSchema.safeParse({ ...userInput, activeFrom: '2026-11-01', activeTo: '2026-11-30' }).success).toBe(true);
    expect(CreateUserSchema.safeParse({ ...userInput, activeFrom: '2026-11-30', activeTo: '2026-11-01' }).success).toBe(false);
    expect(CreateUserSchema.safeParse({ ...userInput, activeFrom: '30/11/2026' }).success).toBe(false);
  });
  it('แก้ไขบัญชี: รหัสผ่านเว้นว่างได้ และ checkbox active ไม่ติ๊ก = ปิดใช้งาน', () => {
    const parsed = UpdateUserSchema.safeParse({ ...userInput, password: '', confirmPassword: '' });
    expect(parsed.success && parsed.data.active).toBe(false);
    const on = UpdateUserSchema.safeParse({ ...userInput, password: '', confirmPassword: '', active: 'on' });
    expect(on.success && on.data.active).toBe(true);
  });
});
