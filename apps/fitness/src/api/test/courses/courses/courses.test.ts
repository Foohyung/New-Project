import { describe, expect, it } from 'vitest';
import { CourseCreateSchema, CourseUpdateSchema } from '@/api/schemas/courses/courses/courses.schema';
import { canEnroll, seatsLeft } from '@/api/services/courses/courses/courses.service';

const base = { title: 'มวยไทยพื้นฐาน', schedule: 'จ./พ. 18:00–19:00', startsOn: '2026-11-02', endsOn: '2026-11-25', sessions: '8', capacity: '12', price: '2500', active: 'on', trainerId: '', room: '', description: '' };

describe('ฟอร์มคอร์ส', () => {
  it('แปลงตัวเลข ราคาเป็นสตางค์ และช่องว่างเป็น null', () => {
    expect(CourseCreateSchema.parse(base)).toMatchObject({ sessions: 8, capacity: 12, price: 250_000, active: true, trainerId: null, room: null, description: null });
  });

  it('วันจบต้องไม่ก่อนวันเริ่ม', () => {
    expect(CourseCreateSchema.safeParse({ ...base, endsOn: '2026-11-01' }).success).toBe(false);
    expect(CourseCreateSchema.safeParse({ ...base, endsOn: '2026-11-02' }).success).toBe(true);
  });

  it('ปฏิเสธที่นั่ง 0 ราคา 0 และไม่มี id ตอนแก้ไข', () => {
    expect(CourseCreateSchema.safeParse({ ...base, capacity: '0' }).success).toBe(false);
    expect(CourseCreateSchema.safeParse({ ...base, price: '0' }).success).toBe(false);
    expect(CourseUpdateSchema.safeParse(base).success).toBe(false);
  });
});

describe('ที่นั่งและการรับสมัคร', () => {
  it('ที่ว่างไม่ติดลบ', () => {
    expect(seatsLeft(12, 5)).toBe(7);
    expect(seatsLeft(3, 5)).toBe(0);
  });

  it('รับสมัครได้เมื่อเปิดรับและคอร์สยังไม่จบ', () => {
    expect(canEnroll({ active: true, endsOn: '2026-11-25' }, '2026-11-25')).toBe(true);
    expect(canEnroll({ active: true, endsOn: '2026-11-25' }, '2026-11-26')).toBe(false);
    expect(canEnroll({ active: false, endsOn: '2026-11-25' }, '2026-11-01')).toBe(false);
  });
});
