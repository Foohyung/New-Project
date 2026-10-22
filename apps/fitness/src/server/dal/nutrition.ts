import 'server-only';
import { bangkokDate } from '@repo/utils';
import { dailyTargets, slotAt, suggestMeals, sumMacros, type BodyProfile, type Macros, type Meal, type Slot } from '@/features/nutrition/service';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db, HEALTH_NOTICE_VERSION, nextId } from '../db';
import { authorize } from '../rbac';

export interface MyNutritionDto {
  /** null = ยังไม่ยินยอม/ยังไม่กรอกข้อมูลร่างกาย */
  profile: (BodyProfile & { consentAt: string }) | null;
  target: Macros | null;
  eaten: Macros;
  logs: { id: string; name: string; kcal: number; proteinG: number; loggedAt: string }[];
  slot: Slot;
  suggestions: Meal[];
}

/* ข้อมูลสุขภาพ: เฉพาะเจ้าของบัญชี (userId จาก session) — ไม่มีฟังก์ชันใดให้บทบาทอื่นอ่านของคนอื่น แม้แต่เจ้าของยิม */
async function ownerOf(session: Session): Promise<string> {
  await authorize(session, 'coach.use');
  return session.userId;
}

const bangkokHour = (d: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hourCycle: 'h23' }).format(d));

export async function getMyNutrition(session: Session): Promise<MyNutritionDto> {
  const userId = await ownerOf(session);
  const store = db();
  const date = today();
  const record = store.healthProfiles.find(p => p.userId === userId);
  const logs = record ? store.mealLogs.filter(l => l.userId === userId && l.date === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)) : [];
  const eaten = sumMacros(logs);
  const profile = record ? { sex: record.sex, birthYear: record.birthYear, heightCm: record.heightCm, weightKg: record.weightKg, goal: record.goal, activity: record.activity, consentAt: record.consentAt } : null;
  const target = profile ? dailyTargets(profile, Number(date.slice(0, 4))) : null;
  const slot = slotAt(bangkokHour(now()));
  return {
    profile,
    target,
    eaten,
    logs: logs.map(l => ({ id: l.id, name: l.name, kcal: l.kcal, proteinG: l.proteinG, loggedAt: l.loggedAt })),
    slot,
    suggestions: target ? suggestMeals(slot, target.kcal - eaten.kcal) : [],
  };
}

/** บันทึกข้อมูลร่างกาย — ต้องมาพร้อมความยินยอมที่ action ตรวจแล้ว · บันทึกเวลาและเวอร์ชันประกาศไว้เป็นหลักฐาน */
export async function saveMyHealthProfile(session: Session, profile: BodyProfile): Promise<void> {
  const userId = await ownerOf(session);
  const store = db();
  const at = now().toISOString();
  const existing = store.healthProfiles.find(p => p.userId === userId);
  if (existing) Object.assign(existing, profile, { updatedAt: at });
  else store.healthProfiles.push({ ...profile, userId, consentAt: at, noticeVersion: HEALTH_NOTICE_VERSION, updatedAt: at });
}

/** ถอนความยินยอม = ลบข้อมูลร่างกายและบันทึกอาหารทั้งหมดของสมาชิกทันที (§11.3) */
export async function withdrawMyHealthConsent(session: Session): Promise<void> {
  const userId = await ownerOf(session);
  const store = db();
  store.healthProfiles = store.healthProfiles.filter(p => p.userId !== userId);
  store.mealLogs = store.mealLogs.filter(l => l.userId !== userId);
}

export async function logMyMeal(session: Session, meal: { name: string } & Macros): Promise<void> {
  const userId = await ownerOf(session);
  const store = db();
  // ไม่มี consent = ไม่เก็บข้อมูลการกิน
  if (!store.healthProfiles.some(p => p.userId === userId)) throw new Error('NO_HEALTH_CONSENT');
  const at = now();
  store.mealLogs.push({ id: nextId('ml'), userId, date: bangkokDate(at), ...meal, loggedAt: at.toISOString() });
}

export async function deleteMyMeal(session: Session, logId: string): Promise<void> {
  const userId = await ownerOf(session);
  const store = db();
  const before = store.mealLogs.length;
  store.mealLogs = store.mealLogs.filter(l => !(l.id === logId && l.userId === userId));
  if (store.mealLogs.length === before) throw new Error('NOT_FOUND');
}
