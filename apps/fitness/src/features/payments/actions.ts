'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { confirmPayment, createSelfPayment, submitSlip } from '@/server/dal/payments';
import { knownFailure, type ActionResult } from '../shared/action-result';

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
export async function submitSlipAction(paymentId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const p = await submitSlip(session, paymentId);
    await audit(session, 'payment.slip', 'payment', paymentId);
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
