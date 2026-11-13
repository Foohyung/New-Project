import { z } from 'zod';
import { COUPON_TARGETS, normalizeCouponCode } from '@/api/services/coupons/coupons/coupons.service';

const couponFields = {
  description: z.string().trim().min(2, 'ใส่คำอธิบายสั้น ๆ เช่น ต่ออายุก่อนหมด').max(60, 'ยาวเกิน 60 ตัวอักษร'),
  type: z.enum(['percent', 'baht', 'days'], { error: 'เลือกประเภทส่วนลด' }),
  value: z.coerce.number({ error: 'ใส่ตัวเลข' }).positive('ต้องมากกว่า 0'),
  appliesTo: z.array(z.enum(COUPON_TARGETS)).min(1, 'เลือกอย่างน้อย 1 ประเภท').default(['membership']),
  packageIds: z.array(z.string()).transform(v => (v.length ? v : null)),
  renewOnly: z.boolean(),
  newOnly: z.boolean(),
  limit: z.string().trim().optional().transform(v => (v ? Number(v) : null)).refine(v => v === null || (Number.isInteger(v) && v > 0 && v <= 10_000), 'จำนวนสิทธิ์ 1–10,000 หรือเว้นว่าง = ไม่จำกัด'),
  startsOn: z.iso.date({ error: 'เลือกวันที่เริ่มใช้คูปอง' }),
  expiresOn: z.union([z.iso.date(), z.literal('')]).optional().transform(v => (v ? v : null)),
  perMember: z.coerce.number({ error: 'ใส่ตัวเลข' }).int('ใส่จำนวนเต็ม').min(1, 'อย่างน้อย 1 ครั้ง').max(100, 'ไม่เกิน 100 ครั้ง'),
  minMemberDays: z.string().trim().optional().transform(v => (v ? Number(v) : null)).refine(v => v === null || (Number.isInteger(v) && v > 0 && v <= 3650), 'ใส่ 1–3,650 วัน หรือเว้นว่าง = ไม่จำกัด'),
  proofRequired: z.string().trim().max(200, 'ยาวเกิน 200 ตัวอักษร').optional().transform(v => (v ? v : null)),
  terms: z.string().trim().max(500, 'ยาวเกิน 500 ตัวอักษร').optional().transform(v => (v ? v : null)),
};

const couponFieldsSchema = z.object(couponFields);
function validateCouponFields(v: z.output<typeof couponFieldsSchema>, ctx: z.RefinementCtx): void {
  if (v.type === 'days' && v.appliesTo.some(target => target !== 'membership')) {
    ctx.addIssue({ code: 'custom', path: ['appliesTo'], message: 'คูปองแถมวันใช้ได้เฉพาะสมาชิก/แพ็กเกจ' });
  }
  if (v.packageIds && !v.appliesTo.includes('membership')) {
    ctx.addIssue({ code: 'custom', path: ['packageIds'], message: 'ต้องเลือกใช้กับสมาชิก/แพ็กเกจด้วยจึงจะจำกัดแพ็กเกจได้' });
  }
  if ((v.renewOnly || v.newOnly || v.minMemberDays) && !v.appliesTo.includes('membership')) {
    ctx.addIssue({ code: 'custom', path: ['appliesTo'], message: 'เงื่อนไขการเป็นสมาชิกใช้ได้เมื่อเลือกสมาชิก/แพ็กเกจ' });
  }
  if (v.type === 'percent' && (!Number.isInteger(v.value) || v.value > 90)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'ลดได้ 1–90%' });
  if (v.type === 'days' && (!Number.isInteger(v.value) || v.value > 60)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'แถมได้ 1–60 วัน' });
  if (v.type === 'baht' && v.value > 10_000) ctx.addIssue({ code: 'custom', path: ['value'], message: 'ลดได้ไม่เกิน ฿10,000' });
  if (v.renewOnly && v.newOnly) ctx.addIssue({ code: 'custom', path: ['renewOnly'], message: 'เลือกได้อย่างใดอย่างหนึ่ง: ต่ออายุ หรือ สมาชิกใหม่' });
  if (v.newOnly && v.minMemberDays) ctx.addIssue({ code: 'custom', path: ['minMemberDays'], message: 'สมาชิกใหม่ยังไม่มีวันสมาชิก — เลือก "เฉพาะสมาชิกใหม่" หรือ "เป็นสมาชิกอย่างน้อย" อย่างใดอย่างหนึ่ง' });
  if (v.startsOn && v.expiresOn && v.startsOn > v.expiresOn) {
    ctx.addIssue({ code: 'custom', path: ['expiresOn'], message: 'วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มใช้' });
  }
}

const toCouponData = (v: z.output<typeof couponFieldsSchema>) => ({ ...v, value: v.type === 'baht' ? Math.round(v.value * 100) : v.value });

export const CouponCreateSchema = z.object({
  code: z.string().transform(normalizeCouponCode).pipe(z.string().regex(/^[A-Z0-9-]{3,40}$/, 'ใช้ A–Z ตัวเลข หรือขีด 3–40 ตัว')),
  ...couponFields,
}).superRefine((v, ctx) => { validateCouponFields(v, ctx); }).transform(v => ({ ...toCouponData(v), code: v.code }));

export const CouponUpdateSchema = couponFieldsSchema.superRefine(validateCouponFields).transform(toCouponData);

export const PurchaseCouponPreviewSchema = z.discriminatedUnion('target', [
  z.object({
    code: z.string().trim().min(1).max(40),
    target: z.literal('product'),
    items: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(999) })).min(1).max(50),
  }),
  z.object({
    code: z.string().trim().min(1).max(40),
    target: z.literal('course'),
    courseId: z.string().min(1).max(40),
  }),
]);
