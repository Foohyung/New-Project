import { z } from 'zod';
import { normalizeCouponCode } from '@/api/services/coupons/coupons/coupons.service';

export const CouponCreateSchema = z
  .object({
    code: z.string().transform(normalizeCouponCode).pipe(z.string().regex(/^[A-Z0-9-]{3,20}$/, 'ใช้ A–Z ตัวเลข หรือขีด 3–20 ตัว')),
    description: z.string().trim().min(2, 'ใส่คำอธิบายสั้น ๆ เช่น ต่ออายุก่อนหมด').max(60, 'ยาวเกิน 60 ตัวอักษร'),
    type: z.enum(['percent', 'baht', 'days'], { error: 'เลือกประเภทส่วนลด' }),
    value: z.coerce.number({ error: 'ใส่ตัวเลข' }).positive('ต้องมากกว่า 0'),
    packageIds: z.array(z.string()).transform(v => (v.length ? v : null)),
    renewOnly: z.boolean(),
    newOnly: z.boolean(),
    limit: z.string().trim().optional().transform(v => (v ? Number(v) : null)).refine(v => v === null || (Number.isInteger(v) && v > 0 && v <= 10_000), 'จำนวนสิทธิ์ 1–10,000 หรือเว้นว่าง = ไม่จำกัด'),
    expiresOn: z.union([z.iso.date(), z.literal('')]).optional().transform(v => (v ? v : null)),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'percent' && (!Number.isInteger(v.value) || v.value > 90)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'ลดได้ 1–90%' });
    if (v.type === 'days' && (!Number.isInteger(v.value) || v.value > 60)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'แถมได้ 1–60 วัน' });
    if (v.type === 'baht' && v.value > 10_000) ctx.addIssue({ code: 'custom', path: ['value'], message: 'ลดได้ไม่เกิน ฿10,000' });
    if (v.renewOnly && v.newOnly) ctx.addIssue({ code: 'custom', path: ['renewOnly'], message: 'เลือกได้อย่างใดอย่างหนึ่ง: ต่ออายุ หรือ สมาชิกใหม่' });
  })
  // ลดเป็นบาท เก็บเป็นสตางค์
  .transform(v => ({ ...v, value: v.type === 'baht' ? Math.round(v.value * 100) : v.value }));
