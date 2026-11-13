'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { confirmPayment, createSelfPayment, submitSlip } from '@/api/dal/payments/payments/payments.dal';
import { knownFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { readImageUpload } from '@/api/services/shared/shared/shared.image';

const MAX_SLIP_BYTES = 10 * 1024 * 1024;

function refreshPayment(id: string, memberId: string) {
  revalidatePath('/payments');
  revalidatePath(`/payments/${id}`);
  revalidatePath(`/members/${memberId}`);
  revalidatePath('/me');
  revalidatePath('/');
}

/** ยืนยันว่าเงินเข้าแล้ว (ตรวจสลิป) → ต่ออายุให้สมาชิกทันที */
export async function confirmPaymentAction(paymentId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const p = await confirmPayment(session, paymentId);
    await audit(session, 'payment.confirm', 'payment', paymentId);
    refreshPayment(paymentId, p.memberId);
    return { ok: true, message: `ยืนยันการชำระ ${p.receiptNo} แล้ว ระบบต่ออายุให้สมาชิกเรียบร้อย` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** แจ้งว่าโอนแล้ว (สมาชิกทำเองในหน้า /me หรือเคาน์เตอร์ทำให้) */
export async function submitSlipAction(paymentId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const uploaded = await readImageUpload(formData.get('slipFile'), MAX_SLIP_BYTES);
  if (uploaded && 'error' in uploaded) return { ok: false, message: uploaded.error, fieldErrors: { slipFile: uploaded.error } };
  const slip = uploaded ?? undefined;
  if (session.role === 'member' && !slip) return { ok: false, message: 'กรุณาแนบรูปสลิปก่อนแจ้งชำระ', fieldErrors: { slipFile: 'กรุณาเลือกรูปสลิป' } };
  try {
    const p = await submitSlip(session, paymentId, slip);
    await audit(session, 'payment.slip', 'payment', paymentId, { after: { slipUploaded: Boolean(slip) } });
    refreshPayment(paymentId, p.memberId);
    return { ok: true, message: 'ได้รับแจ้งการโอนแล้ว เจ้าหน้าที่จะตรวจยอดและต่ออายุให้ภายใน 15 นาที' };
  } catch (error) {
    return knownFailure(error);
  }
}

/** สมาชิกซื้อ/ต่อแพ็กเกจเองด้วย PromptPay */
export async function buyPackageAction(packageId: string, couponCode: string | null, fromReminder: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let paymentId: string;
  try {
    const p = await createSelfPayment(session, packageId, couponCode, fromReminder);
    paymentId = p.id;
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'payment.self_create', 'payment', paymentId);
  revalidatePath('/me');
  redirect(`/me/pay/${paymentId}`);
}
