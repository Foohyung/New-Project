import { z } from 'zod';

export const MemberQuerySchema = z.object({
  query: z.string().trim().min(3, 'กรอกเบอร์โทรหรือรหัสสมาชิกอย่างน้อย 3 ตัวอักษร').max(40, 'ข้อความยาวเกินไป'),
});

export const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'เวลาไม่ถูกต้อง ตัวอย่าง 18:30');

export const ClassCreateSchema = z.object({
  title: z.string().trim().min(2, 'กรอกชื่อคลาส').max(60, 'ชื่อคลาสยาวเกินไป'),
  trainerId: z.string().min(1, 'เลือกเทรนเนอร์'),
  room: z.string().trim().min(1, 'กรอกห้อง').max(40, 'ชื่อห้องยาวเกินไป'),
  date: z.iso.date({ error: 'เลือกวันที่' }),
  time: TimeSchema,
  minutes: z.coerce.number().int().min(30, 'คลาสต้องยาวอย่างน้อย 30 นาที').max(120, 'คลาสยาวได้ไม่เกิน 120 นาที'),
  capacity: z.coerce.number().int().min(1, 'ความจุต้องมากกว่า 0').max(60, 'ความจุไม่เกิน 60 คน'),
  level: z.enum(['ง่าย', 'กลาง', 'หนัก'], { error: 'เลือกระดับความยาก' }),
});
