import { isThaiMobile, normalizePhone } from '@repo/utils';
import { z } from 'zod';

/** ฟอร์มนัดชม/สอบถาม — ข้อมูลระดับ Confidential (§11.1) */
export const ContactSchema = z.object({
  homeSlug: z.string().regex(/^[a-z0-9-]{3,80}$/),
  name: z.string().trim().min(2, 'กรอกชื่ออย่างน้อย 2 ตัวอักษร').max(80, 'ชื่อยาวเกินไป'),
  phone: z
    .string()
    .trim()
    .refine(isThaiMobile, 'กรอกเบอร์มือถือ 10 หลัก เช่น 081-234-5678')
    .transform(normalizePhone),
  message: z.string().trim().max(1000, 'ข้อความยาวเกิน 1,000 ตัวอักษร').optional().default(''),
  consent: z.literal('on', { error: 'กรุณายินยอมให้ติดต่อกลับก่อนส่งข้อมูล' }),
  /** honeypot: ช่องที่ซ่อนไว้ คนจริงจะไม่กรอก */
  website: z.string().max(0).optional().default(''),
});

export type ContactInput = z.infer<typeof ContactSchema>;
