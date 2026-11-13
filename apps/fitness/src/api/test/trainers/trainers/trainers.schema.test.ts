import { describe, expect, it } from 'vitest';
import { TrainerCreateSchema, TrainerUpdateSchema } from '@/api/schemas/trainers/trainers/trainers.schema';

const base = { name: 'ณัฐวุฒิ บุญเลิศ', nickname: 'โค้ชบอส', specialties: ' HIIT, Functional ,HIIT,', bio: '', color: 'var(--color-lime)' };

describe('ฟอร์มเทรนเนอร์', () => {
  it('แยกความถนัดด้วยจุลภาค ตัดช่องว่างและตัวซ้ำ', () => {
    expect(TrainerCreateSchema.parse(base)).toEqual({ ...base, specialties: ['HIIT', 'Functional'] });
    expect(TrainerCreateSchema.parse({ ...base, specialties: undefined }).specialties).toEqual([]);
  });

  it('ปฏิเสธชื่อสั้นเกิน สีนอกรายการ ความถนัดเกิน 8 อย่าง และแก้ไขโดยไม่มี id', () => {
    expect(TrainerCreateSchema.safeParse({ ...base, name: 'ก' }).success).toBe(false);
    expect(TrainerCreateSchema.safeParse({ ...base, color: 'red' }).success).toBe(false);
    expect(TrainerCreateSchema.safeParse({ ...base, specialties: 'a,b,c,d,e,f,g,h,i' }).success).toBe(false);
    expect(TrainerUpdateSchema.safeParse(base).success).toBe(false);
  });
});
