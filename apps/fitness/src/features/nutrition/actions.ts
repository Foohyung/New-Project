'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { today } from '@/server/clock';
import { deleteMyMeal, logMyMeal, saveMyHealthProfile, withdrawMyHealthConsent } from '@/server/dal/nutrition';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { CustomMealSchema, healthProfileSchema } from './schema';
import { findMeal } from './service';

const refresh = () => {
  revalidatePath('/me/food');
};

export async function saveHealthProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = healthProfileSchema(Number(today().slice(0, 4))).safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { healthConsent: _consent, ...profile } = parsed.data;
  try {
    await saveMyHealthProfile(session, profile);
    await audit(session, 'health.profile.save', 'user', session.userId);
    refresh();
    return { ok: true, message: 'บันทึกแล้ว คำนวณเป้าอาหารให้ใหม่' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function withdrawHealthConsentAction(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await withdrawMyHealthConsent(session);
    await audit(session, 'health.consent.withdraw', 'user', session.userId);
    refresh();
    return { ok: true, message: 'ถอนความยินยอมและลบข้อมูลร่างกายกับบันทึกอาหารทั้งหมดแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}

/** กด "กินแล้ว" จากเมนูแนะนำ — ใช้ค่าสารอาหารจากคลังเมนูฝั่ง server ไม่เชื่อค่าจากฟอร์ม */
export async function logMenuMealAction(mealId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const meal = findMeal(mealId);
  if (!meal) return { ok: false, message: 'ไม่พบเมนูนี้ ลองรีเฟรชหน้า' };
  try {
    await logMyMeal(session, { name: meal.name, kcal: meal.kcal, proteinG: meal.proteinG, carbG: meal.carbG, fatG: meal.fatG });
    refresh();
    return { ok: true, message: `บันทึก ${meal.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function logCustomMealAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CustomMealSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await logMyMeal(session, { ...parsed.data, carbG: 0, fatG: 0 });
    refresh();
    return { ok: true, message: `บันทึก ${parsed.data.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function deleteMealAction(logId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await deleteMyMeal(session, logId);
    refresh();
    return { ok: true, message: 'ลบรายการแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
