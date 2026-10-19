'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { runReminders, updateRound } from '@/server/dal/reminders';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { RoundSchema } from './schema';
import type { RoundId } from './service';

export async function updateRoundAction(id: RoundId, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = RoundSchema.safeParse({ ...formObject(formData), enabled: formData.get('enabled') === 'on', channels: formData.getAll('channels') });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateRound(session, id, parsed.data);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'reminder.update', 'reminder_round', id);
  revalidatePath('/marketing');
  return { ok: true, message: 'บันทึกรอบนี้แล้ว' };
}

export async function runRemindersAction(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const count = await runReminders(session);
    await audit(session, 'reminder.run', 'reminder_round', 'today');
    revalidatePath('/marketing');
    return { ok: true, message: count ? `ส่งแล้ว ${String(count)} คน (จำลอง)` : 'วันนี้ไม่มีใครถึงรอบ หรือส่งไปแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
