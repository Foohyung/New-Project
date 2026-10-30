import { z } from 'zod';
import { CHANNELS, unknownVars } from '@/api/services/reminders/reminders/reminders.service';

export const RoundSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(z.enum(CHANNELS)),
  template: z
    .string()
    .trim()
    .min(10, 'ข้อความสั้นเกินไป')
    .max(300, 'ข้อความยาวเกิน 300 ตัวอักษร (SMS จะถูกตัด)')
    .superRefine((t, ctx) => {
      const unknown = unknownVars(t);
      if (unknown.length) ctx.addIssue({ code: 'custom', message: `ไม่รู้จักตัวแปร {${unknown.join('}, {')}}` });
    })
    .refine(t => t.includes('{ลิงก์ชำระ}'), 'ต้องมี {ลิงก์ชำระ} เพื่อให้สมาชิกกดจ่ายได้'),
  couponCode: z.string().trim().toUpperCase().optional().transform(v => (v ? v : null)),
});
