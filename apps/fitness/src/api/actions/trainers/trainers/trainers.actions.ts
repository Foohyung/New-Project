'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { findMember } from '@/api/dal/members/members/members.dal';
import { bookPt, cancelPt, completePt, createTrainer, deleteTrainer, updateTrainer } from '@/api/dal/trainers/trainers/trainers.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { PtBookSchema, TrainerCreateSchema, TrainerUpdateSchema } from '@/api/schemas/trainers/trainers/trainers.schema';
import { PT_REJECT } from '@/api/services/trainers/trainers/trainers.service';

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

export async function createTrainerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = TrainerCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const t = await createTrainer(session, parsed.data);
    await audit(session, 'trainer.create', 'trainers', t.id, { after: parsed.data });
    refreshTrainer(t.id);
    return { ok: true, message: `เพิ่มเทรนเนอร์ ${t.nickname} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateTrainerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = TrainerUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    const { before, after } = await updateTrainer(session, id, input);
    await audit(session, 'trainer.update', 'trainers', id, { before: { ...before }, after: { ...after } });
    refreshTrainer(id);
    return { ok: true, message: `บันทึกข้อมูล ${after.nickname} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ลบเทรนเนอร์และย้ายตารางคลาสเดิมไปยังเทรนเนอร์ที่เลือก */
export async function deleteTrainerAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const rawReplacementId = formData.get('replacementTrainerId');
  if (rawReplacementId !== null && (typeof rawReplacementId !== 'string' || rawReplacementId.length > 40)) {
    return { ok: false, message: 'เลือกเทรนเนอร์ใหม่ไม่ถูกต้อง' };
  }
  const replacementTrainerId = typeof rawReplacementId === 'string' && rawReplacementId.trim() ? rawReplacementId.trim() : null;
  try {
    const result = await deleteTrainer(session, id, replacementTrainerId);
    await audit(session, 'trainer.delete', 'trainers', id, {
      before: { name: result.name },
      after: { replacementTrainerName: result.replacementTrainerName, reassignedClassCount: result.classIds.length },
    });
    refreshTrainer(id);
    revalidatePath('/classes');
    if (result.replacementTrainerId) revalidatePath(`/trainers/${result.replacementTrainerId}`);
    for (const classId of result.classIds) revalidatePath(`/classes/${classId}`);
    const reassignment = result.replacementTrainerName ? ` · ย้ายตารางคลาส ${String(result.classIds.length)} รายการให้ ${result.replacementTrainerName}` : '';
    return { ok: true, message: `ลบเทรนเนอร์ ${result.name} แล้ว${reassignment}` };
  } catch (error) {
    return knownFailure(error);
  }
}
