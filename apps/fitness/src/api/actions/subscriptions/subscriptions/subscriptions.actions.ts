'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { runBilling, sendPayLinkForCharge, setMyAutoRenew } from '@/api/dal/subscriptions/subscriptions/subscriptions.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

function refresh() {
  revalidatePath('/payments');
  revalidatePath('/payments/subscriptions');
  revalidatePath('/me');
  revalidatePath('/retention');
}

export async function runBillingAction(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const r = await runBilling(session);
    await audit(session, 'billing.run', 'charge', 'today');
    refresh();
    return { ok: true, message: r.charged + r.failed === 0 ? 'ไม่มีรายการถึงกำหนดวันนี้' : `ตัดผ่าน ${String(r.charged)} · ไม่ผ่าน ${String(r.failed)} (จำลอง)` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function sendPayLinkAction(chargeId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const paymentId = await sendPayLinkForCharge(session, chargeId);
    await audit(session, 'billing.paylink', 'payment', paymentId);
    refresh();
    return { ok: true, message: 'ส่งลิงก์ PromptPay ทาง LINE + SMS แล้ว (จำลอง)', href: `/payments/${paymentId}` };
  } catch (error) {
    return knownFailure(error);
  }
}

const AutoRenewSchema = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal('off') }),
  z.object({ enabled: z.literal('on'), last4: z.string().regex(/^\d{4}$/, 'เลือกบัตร') }),
]);

/** สมาชิกเปิด/ปิดต่ออายุอัตโนมัติ — DAL ใช้ memberId จาก session (กัน IDOR) */
export async function setAutoRenewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = AutoRenewSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await setMyAutoRenew(session, parsed.data.enabled === 'on' ? { enabled: true, last4: parsed.data.last4 } : { enabled: false });
    await audit(session, parsed.data.enabled === 'on' ? 'autorenew.enable' : 'autorenew.disable', 'member', session.memberId ?? '');
    refresh();
    return { ok: true, message: parsed.data.enabled === 'on' ? 'เปิดต่ออายุอัตโนมัติแล้ว จะแจ้งเตือนก่อนตัดบัตร 3 วัน' : 'ปิดต่ออายุอัตโนมัติแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
