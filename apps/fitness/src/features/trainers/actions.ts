'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { findMember } from '@/server/dal/members';
import { bookPt, cancelPt, completePt } from '@/server/dal/trainers';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { PtBookSchema } from './schema';
import { PT_REJECT } from './service';

function refreshTrainer(trainerId: string) {
  revalidatePath('/trainers');
  revalidatePath(`/trainers/${trainerId}`);
  revalidatePath('/me');
}

export async function bookPtAction(trainerId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = PtBookSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const member = await findMember(session, parsed.data.query);
    if (!member) return { ok: false, message: 'ไม่พบสมาชิก ตรวจเบอร์โทรหรือรหัสสมาชิกอีกครั้ง', fieldErrors: { query: 'ไม่พบสมาชิก' } };
    const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00+07:00`).toISOString();
    const decision = await bookPt(session, trainerId, member.id, startsAt);
    if (!decision.ok) return { ok: false, message: PT_REJECT[decision.reason] };
    await audit(session, 'pt.book', 'trainer', trainerId);
    refreshTrainer(trainerId);
    return { ok: true, message: `จอง PT ให้ ${member.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function completePtAction(trainerId: string, sessionId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await completePt(session, sessionId);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'pt.complete', 'pt_session', sessionId);
  refreshTrainer(trainerId);
  return { ok: true, message: 'บันทึกว่าเทรนเสร็จแล้ว หักครั้ง PT ของสมาชิก 1 ครั้ง' };
}

export async function cancelPtAction(trainerId: string, sessionId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await cancelPt(session, sessionId);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'pt.cancel', 'pt_session', sessionId);
  refreshTrainer(trainerId);
  return { ok: true, message: 'ยกเลิกคิว PT แล้ว ไม่หักครั้งของสมาชิก' };
}
