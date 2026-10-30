'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { sendManualReminder } from '@/api/dal/reminders/reminders/reminders.dal';
import { giveWinbackCoupon, recordFollowUp } from '@/api/dal/retention/retention/retention.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const ContactSchema = z.object({
  stage: z.enum(['todo', 'contacted', 'won']).catch('contacted'),
  note: z.string().trim().min(2, 'จดสั้น ๆ ว่าคุยอะไร เช่น ติดงาน จะกลับมาเดือนหน้า').max(140, 'ยาวเกิน 140 ตัวอักษร'),
});

export async function recordContactAction(memberId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ContactSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await recordFollowUp(session, memberId, parsed.data.stage, parsed.data.note);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'followup.record', 'member', memberId);
  revalidatePath('/retention');
  return { ok: true, message: 'บันทึกการติดต่อแล้ว' };
}

export async function winbackAction(memberId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const code = await giveWinbackCoupon(session, memberId);
    await audit(session, 'followup.coupon', 'member', memberId);
    revalidatePath('/retention');
    return { ok: true, message: `ให้คูปอง ${code} (ลด 15%) แล้ว แจ้งโค้ดนี้กับสมาชิกได้เลย` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function messageAction(memberId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const { name } = await sendManualReminder(session, memberId);
    await recordFollowUp(session, memberId, 'contacted', 'ส่งข้อความชวนกลับทาง LINE');
    await audit(session, 'followup.message', 'member', memberId);
    revalidatePath('/retention');
    return { ok: true, message: `ส่งข้อความถึง ${name} แล้ว (จำลอง)` };
  } catch (error) {
    return knownFailure(error);
  }
}
