import { describe, expect, it } from 'vitest';
import { MemberFieldsSchema } from '@/api/schemas/members/members/members.schema';

const base = { name: 'ทดสอบ สมาชิก', phone: '0812345678' };

describe('เบอร์โทรสมาชิก', () => {
  it('ใส่อะไรก็ได้ไม่เกิน 10 ตัว และตัดขีด/ช่องว่างก่อนเก็บ', () => {
    for (const phone of ['021234567', '+6621234', 'ABC123', '12']) {
      expect(MemberFieldsSchema.safeParse({ ...base, phone }).success).toBe(true);
    }
    const parsed = MemberFieldsSchema.safeParse({ ...base, phone: '02-123-456' });
    expect(parsed.success && parsed.data.phone).toBe('02123456');
  });
  it('ว่าง หรือเกิน 10 ตัว ไม่ผ่าน', () => {
    expect(MemberFieldsSchema.safeParse({ ...base, phone: '' }).success).toBe(false);
    expect(MemberFieldsSchema.safeParse({ ...base, phone: '081-234-5678' }).success).toBe(false);
    expect(MemberFieldsSchema.safeParse({ ...base, phone: '---' }).success).toBe(false);
  });
});
