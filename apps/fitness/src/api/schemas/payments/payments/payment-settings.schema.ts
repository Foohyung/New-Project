import { z } from 'zod';
import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';

const METHODS: PaymentMethod[] = ['promptpay', 'card', 'cash', 'transfer'];

export const PaymentSettingsSchema = z.object({
  branch: z.string().trim().min(1),
  paymentMethods: z.array(z.enum(['promptpay', 'card', 'cash', 'transfer'])).min(1, 'เลือกวิธีชำระอย่างน้อย 1 วิธี'),
  promptPayMode: z.enum(['id', 'qr']),
  promptPayId: z.string().trim(),
}).superRefine((value, ctx) => {
  if (!value.paymentMethods.includes('promptpay')) return;
  if (value.promptPayMode === 'id' && (!/^[\d\s+-]+$/.test(value.promptPayId) || !/^(?:\d{10}|\d{13})$/.test(value.promptPayId.replace(/\D/g, '')))) {
    ctx.addIssue({ code: 'custom', path: ['promptPayId'], message: 'กรอกเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน/เลขผู้เสียภาษี 13 หลัก' });
  }
});

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && METHODS.includes(value as PaymentMethod);
}
