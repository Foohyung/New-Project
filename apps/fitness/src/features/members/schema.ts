import { isThaiMobile, normalizePhone } from '@repo/utils';
import { z } from 'zod';
import { FREEZE_MAX_DAYS, FREEZE_MIN_DAYS } from './service';

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}ยาวเกิน ${String(max)} ตัวอักษร`).optional().transform(v => (v ? v : null));

export const PaymentMethodSchema = z.enum(['promptpay', 'card', 'cash', 'transfer'], { error: 'เลือกวิธีชำระเงิน' });

export const MemberFieldsSchema = z.object({
  name: z.string().trim().min(4, 'กรอกชื่อและนามสกุล').max(80, 'ชื่อยาวเกินไป'),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine(isThaiMobile, 'กรอกเบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09'),
  email: z
    .string()
    .trim()
    .optional()
    .transform(v => (v ? v : null))
    .refine(v => v === null || z.email().safeParse(v).success, 'อีเมลไม่ถูกต้อง ตัวอย่าง name@example.com'),
  note: optionalText(200, 'หมายเหตุ'),
});

/** ช่องคูปอง (ไม่บังคับ) — ตรวจความถูกต้องจริงใน DAL */
export const CouponCodeSchema = z.string().trim().max(24, 'โค้ดยาวเกินไป').optional().transform(v => (v ? v : null));

export const MemberCreateSchema = MemberFieldsSchema.extend({
  packageId: z.string().min(1, 'เลือกแพ็กเกจ'),
  method: PaymentMethodSchema,
  couponCode: CouponCodeSchema,
  // ยินยอมรับข่าวสาร/โปรโมชัน แยกจากความยินยอมหลัก และไม่บังคับ (PDPA)
  marketingConsent: z.literal('on').optional().transform(v => v === 'on'),
  // ต้องได้รับความยินยอมก่อนเก็บข้อมูลส่วนบุคคล (PDPA §11)
  consent: z.literal('on', { error: 'ต้องได้รับความยินยอมจากสมาชิกก่อนบันทึกข้อมูล' }),
});

export const RenewSchema = z.object({
  packageId: z.string().min(1, 'เลือกแพ็กเกจ'),
  method: PaymentMethodSchema,
  couponCode: CouponCodeSchema,
});

export const FreezeSchema = z.object({
  days: z.coerce
    .number({ error: 'เลือกจำนวนวัน' })
    .int()
    .min(FREEZE_MIN_DAYS, `พักได้อย่างน้อย ${String(FREEZE_MIN_DAYS)} วัน`)
    .max(FREEZE_MAX_DAYS, `พักได้ไม่เกิน ${String(FREEZE_MAX_DAYS)} วัน`),
});
