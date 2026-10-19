import { z } from 'zod';
import { TimeSchema } from '../classes/schema';

export const PtBookSchema = z.object({
  query: z.string().trim().min(3, 'กรอกเบอร์โทรหรือรหัสสมาชิกอย่างน้อย 3 ตัวอักษร').max(40, 'ข้อความยาวเกินไป'),
  date: z.iso.date({ error: 'เลือกวันที่' }),
  time: TimeSchema,
});
