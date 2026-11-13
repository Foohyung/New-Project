import { describe, expect, it } from 'vitest';
import { PaymentSettingsSchema } from '@/api/schemas/payments/payments/payment-settings.schema';

describe('PaymentSettingsSchema', () => {
  const base = { branch: 'สาขาหลัก', paymentMethods: ['cash'], promptPayMode: 'id', promptPayId: '' };

  it('accepts a branch with any enabled non-PromptPay method', () => {
    expect(PaymentSettingsSchema.safeParse(base).success).toBe(true);
  });

  it('requires a valid PromptPay ID when PromptPay is enabled in ID mode', () => {
    expect(PaymentSettingsSchema.safeParse({ ...base, paymentMethods: ['promptpay'], promptPayId: '081-234-5678' }).success).toBe(true);
    expect(PaymentSettingsSchema.safeParse({ ...base, paymentMethods: ['promptpay'], promptPayId: '12345' }).success).toBe(false);
  });

  it('requires at least one payment method', () => {
    expect(PaymentSettingsSchema.safeParse({ ...base, paymentMethods: [] }).success).toBe(false);
  });
});
