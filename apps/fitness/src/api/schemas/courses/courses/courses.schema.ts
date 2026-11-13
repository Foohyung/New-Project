import { toSatang } from '@/api/lib/utils/utils/utils';
import { z } from 'zod';

const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional().transform(v => (v ? v : null));

const fields = {
  title: z.string().trim().min(2, 'กรอกชื่อคอร์สอย่างน้อย 2 ตัวอักษร').max(120, 'ชื่อคอร์สยาวเกินไป'),
  description: optionalText(1000, 'รายละเอียดยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)'),
  trainerId: z.string().optional().transform(v => (v ? v : null)),
  room: optionalText(60, 'ชื่อห้องยาวเกินไป'),
  schedule: z.string().trim().min(2, 'กรอกวันและเวลาเรียน เช่น จ./พ. 18:00–19:00').max(120, 'วันและเวลาเรียนยาวเกินไป'),
  startsOn: z.iso.date({ error: 'เลือกวันเริ่มเรียน' }),
  endsOn: z.iso.date({ error: 'เลือกวันจบคอร์ส' }),
  sessions: z.coerce.number({ error: 'กรอกจำนวนครั้งเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(1, 'อย่างน้อย 1 ครั้ง').max(200, 'ไม่เกิน 200 ครั้ง'),
  capacity: z.coerce.number({ error: 'กรอกจำนวนที่นั่งเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(1, 'อย่างน้อย 1 ที่').max(500, 'ไม่เกิน 500 ที่'),
  price: z.coerce.number({ error: 'กรอกราคาเป็นตัวเลข' }).positive('ราคาต้องมากกว่า 0').max(100_000, 'ราคาไม่เกิน ฿100,000').transform(toSatang),
  active: z.literal('on').optional().transform(v => v === 'on'),
};

const endsAfterStart = (v: { startsOn: string; endsOn: string }, ctx: z.RefinementCtx) => {
  if (v.endsOn < v.startsOn) ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'วันจบต้องไม่ก่อนวันเริ่ม' });
};

export const CourseCreateSchema = z.object(fields).superRefine(endsAfterStart);
export const CourseUpdateSchema = z.object({ id: z.string().min(1), ...fields }).superRefine(endsAfterStart);

export type CourseInput = z.output<typeof CourseCreateSchema>;
