'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { addToMyPlan, removeFromMyPlan, setExerciseDone } from '@/api/dal/workouts/workouts/workouts.dal';
import { knownFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { MAX_PLAN } from '@/api/services/workouts/workouts/workouts.service';

const refresh = () => {
  revalidatePath('/me/workout');
};

const ExerciseIdsSchema = z.array(z.string().max(40)).min(1, 'เลือกท่าอย่างน้อย 1 ท่า').max(40);

/** เพิ่มท่าที่เลือก (checkbox ชื่อ exerciseId หลายตัว) ลงโปรแกรมวันนี้ — DAL ตัดท่าที่ไม่รู้จัก/ซ้ำออกเอง */
export async function addToPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ExerciseIdsSchema.safeParse(formData.getAll('exerciseId').filter(v => typeof v === 'string'));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'เลือกท่าอย่างน้อย 1 ท่า' };
  try {
    const r = await addToMyPlan(session, parsed.data);
    refresh();
    if (r.added === 0) return { ok: false, message: r.overflow ? `โปรแกรมวันนี้ครบ ${String(MAX_PLAN)} ท่าแล้ว ลบท่าที่ไม่ใช้ออกก่อน` : 'ท่าที่เลือกอยู่ในโปรแกรมวันนี้แล้ว' };
    return { ok: true, message: `เพิ่ม ${String(r.added)} ท่าลงโปรแกรมวันนี้แล้ว${r.overflow ? ` (ครบ ${String(MAX_PLAN)} ท่า บางท่าไม่ได้เพิ่ม)` : ''}` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function toggleDoneAction(exerciseId: string, done: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await setExerciseDone(session, exerciseId, done);
    refresh();
    return { ok: true, message: done ? 'ทำเสร็จแล้ว' : 'ยกเลิกแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function removeFromPlanAction(exerciseId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await removeFromMyPlan(session, exerciseId);
    refresh();
    return { ok: true, message: 'ลบออกจากโปรแกรมแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
