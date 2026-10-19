import { z } from 'zod';

export const CheckInSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, 'กรอกเบอร์โทรหรือรหัสสมาชิกอย่างน้อย 3 ตัวอักษร')
    .max(40, 'ข้อความยาวเกินไป'),
});
