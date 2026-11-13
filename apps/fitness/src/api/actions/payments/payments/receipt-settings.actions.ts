'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { getReceiptSettings, saveReceiptSettings } from '@/api/dal/payments/payments/payments.shop';
import { ReceiptSettingsSchema } from '@/api/schemas/payments/payments/receipt-settings.schema';
import { knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

export async function saveReceiptSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ReceiptSettingsSchema.safeParse({
    branch: text(formData, 'branch'),
    brand: text(formData, 'brand'),
    legalName: text(formData, 'legalName'),
    address: text(formData, 'address'),
    taxId: text(formData, 'taxId'),
    phone: text(formData, 'phone'),
    numberFormat: text(formData, 'numberFormat'),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const current = await getReceiptSettings(session, parsed.data.branch);
    const before = { ...current.saved, numberFormat: current.numberFormat ?? current.defaultNumberFormat };
    const { branch, ...after } = parsed.data;
    await saveReceiptSettings(session, parsed.data);
    await audit(session, 'receipt.settings.update', 'branch', branch, { before, after });
    revalidatePath('/payment-settings');
    revalidatePath('/payments');
    revalidatePath('/sales');
    revalidatePath('/courses');
    revalidatePath('/me');
    return { ok: true, message: 'บันทึกข้อมูลบนใบเสร็จของสาขาแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
