import 'server-only';
import { bangkokDate } from '@/api/lib/utils/utils/utils';
import { dailyTargets, slotAt, suggestMeals, sumMacros, type BodyProfile, type Macros, type Meal, type Slot } from '@/api/services/nutrition/nutrition/nutrition.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, HEALTH_NOTICE_VERSION, prismaAs, toHealthProfile, transaction } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';

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
  const db = prismaAs(session);
  const date = today();
  const row = await db.healthProfile.findUnique({ where: { userId } });
  const record = row ? toHealthProfile(row) : null;
  const logs = record ? await db.mealLog.findMany({ where: { userId, date: asDay(date) }, orderBy: { loggedAt: 'asc' } }) : [];
  const eaten = sumMacros(logs);
  const profile = record ? { sex: record.sex, birthYear: record.birthYear, heightCm: record.heightCm, weightKg: record.weightKg, goal: record.goal, activity: record.activity, consentAt: record.consentAt } : null;
  const target = profile ? dailyTargets(profile, Number(date.slice(0, 4))) : null;
  const slot = slotAt(bangkokHour(now()));
  return {
    profile,
    target,
    eaten,
    logs: logs.map(l => ({ id: l.id, name: l.name, kcal: l.kcal, proteinG: l.proteinG, loggedAt: l.loggedAt.toISOString() })),
    slot,
    suggestions: target ? suggestMeals(slot, target.kcal - eaten.kcal) : [],
  };
}

/** บันทึกข้อมูลร่างกาย — ต้องมาพร้อมความยินยอมที่ action ตรวจแล้ว · บันทึกเวลาและเวอร์ชันประกาศไว้เป็นหลักฐาน */
export async function saveMyHealthProfile(session: Session, profile: BodyProfile): Promise<void> {
  const userId = await ownerOf(session);
  const at = now();
  await prismaAs(session).healthProfile.upsert({
    where: { userId },
    create: { ...profile, userId, consentAt: at, noticeVersion: HEALTH_NOTICE_VERSION, updatedAt: at },
    update: { ...profile, updatedAt: at },
  });
}

/** ถอนความยินยอม = ลบข้อมูลร่างกายและบันทึกอาหารทั้งหมดของสมาชิกทันที (§11.3) */
export async function withdrawMyHealthConsent(session: Session): Promise<void> {
  const userId = await ownerOf(session);
  await transaction(session, async tx => {
    await tx.mealLog.deleteMany({ where: { userId } });
    await tx.healthProfile.deleteMany({ where: { userId } });
  });
}

export async function logMyMeal(session: Session, meal: { name: string } & Macros): Promise<void> {
  const userId = await ownerOf(session);
  const db = prismaAs(session);
  // ไม่มี consent = ไม่เก็บข้อมูลการกิน
  if (!(await db.healthProfile.findUnique({ where: { userId } }))) throw new Error('NO_HEALTH_CONSENT');
  const at = now();
  await db.mealLog.create({ data: { userId, date: asDay(bangkokDate(at)), ...meal, loggedAt: at } });
}

export async function deleteMyMeal(session: Session, logId: string): Promise<void> {
  const userId = await ownerOf(session);
  const { count } = await prismaAs(session).mealLog.deleteMany({ where: { id: logId, userId } });
  if (count === 0) throw new Error('NOT_FOUND');
}
