import { z } from 'zod';
import { receiptFormatError } from '@/api/services/payments/payments/payments.service';

/** หัวใบเสร็จของสาขา — ช่องว่าง = ใช้ค่าเริ่มต้น */
export const ReceiptSettingsSchema = z.object({
  branch: z.string().trim().min(1),
  brand: z.string().trim().max(60, 'ชื่อบนหัวใบเสร็จยาวไม่เกิน 60 ตัวอักษร'),
  legalName: z.string().trim().max(200, 'ชื่อผู้ประกอบการยาวไม่เกิน 200 ตัวอักษร'),
  address: z.string().trim().max(500, 'ที่อยู่ยาวไม่เกิน 500 ตัวอักษร'),
  taxId: z.string().trim().refine(v => v === '' || /^[\d\s-]+$/.test(v) && v.replace(/\D/g, '').length === 13, 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก'),
  numberFormat: z.string().trim().superRefine((v, ctx) => {
    const error = v ? receiptFormatError(v) : null;
    if (error) ctx.addIssue({ code: 'custom', message: error });
  }),
  phone: z.string().trim().refine(v => v === '' || /^[\d\s()+-]{6,30}$/.test(v), 'เบอร์โทรไม่ถูกต้อง'),
});
