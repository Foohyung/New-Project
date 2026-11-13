'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { savePaymentSettings } from '@/api/dal/payments/payments/payments.dal';
import { PaymentSettingsSchema, isPaymentMethod } from '@/api/schemas/payments/payments/payment-settings.schema';
import { detectedImageType, IMAGE_TYPES } from '@/api/services/shared/shared/shared.image';
import { knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const MAX_QR_BYTES = 10 * 1024 * 1024;

export async function savePaymentSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = PaymentSettingsSchema.safeParse({
    branch: formData.get('branch'),
    paymentMethods: formData.getAll('paymentMethods').filter(isPaymentMethod),
    promptPayMode: formData.get('promptPayMode'),
    promptPayId: formData.get('promptPayId') ?? '',
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const fileValue = formData.get('promptPayQrFile');
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  let promptPayQr: { data: string; contentType: string } | undefined;
  if (file) {
    if (file.size > MAX_QR_BYTES) return { ok: false, message: 'ไฟล์ QR ต้องมีขนาดไม่เกิน 10 MB', fieldErrors: { promptPayQrFile: 'ไฟล์มีขนาดใหญ่เกินไป' } };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = detectedImageType(bytes);
    if (!contentType || !IMAGE_TYPES.has(file.type) || file.type !== contentType) {
      return { ok: false, message: 'รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP ที่ถูกต้อง', fieldErrors: { promptPayQrFile: 'ชนิดไฟล์ไม่รองรับ' } };
    }
    promptPayQr = { data: Buffer.from(bytes).toString('base64'), contentType };
  }

  try {
    await savePaymentSettings(session, {
      branch: parsed.data.branch,
      methods: parsed.data.paymentMethods,
      promptPayMode: parsed.data.promptPayMode,
      promptPayId: parsed.data.promptPayId,
      promptPayQr,
      removePromptPayQr: formData.get('promptPayQrRemove') === '1',
    });
    await audit(session, 'payment.settings.update', 'branch', parsed.data.branch, {
      after: { branch: parsed.data.branch, methods: parsed.data.paymentMethods, promptPayMode: parsed.data.promptPayMode, promptPayId: parsed.data.promptPayMode === 'id' ? 'configured' : null, promptPayQr: promptPayQr ? 'uploaded' : formData.get('promptPayQrRemove') === '1' ? 'removed' : undefined },
    });
    revalidatePath('/payment-settings');
    revalidatePath('/members');
    revalidatePath('/sales');
    revalidatePath('/me');
    revalidatePath('/me/courses');
    return { ok: true, message: 'บันทึกวิธีชำระเงินของสาขาแล้ว' };
  } catch (error) {
    if (error instanceof Error && error.message === 'PROMPTPAY_SETUP_REQUIRED') {
      return { ok: false, message: 'เมื่อเปิด PromptPay ต้องกรอกเลข PromptPay หรือแนบรูป QR ก่อน', fieldErrors: { promptPayId: 'กรุณาตั้งค่า PromptPay', promptPayQrFile: 'กรุณาแนบรูป QR หรือปิด PromptPay' } };
    }
    return knownFailure(error);
  }
}
