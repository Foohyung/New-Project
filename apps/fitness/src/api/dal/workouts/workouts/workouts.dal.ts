import 'server-only';
import { findExercise, type Exercise } from '@/api/services/workouts/workouts/workouts.catalog';
import { mergePlan } from '@/api/services/workouts/workouts/workouts.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { today } from '@/api/lib/clock/clock/clock';
import { asDay, jsonStrings, prismaAs } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';

export interface MyWorkoutDto {
  date: string;
  items: (Exercise & { done: boolean })[];
}

interface Plan {
  exerciseIds: string[];
  doneIds: string[];
}

/* ทุกบทบาทเห็น/แก้ได้เฉพาะโปรแกรมของบัญชีตัวเอง (userId จาก session — กัน IDOR) */
async function myPlan(session: Session): Promise<{ key: { userId: string; date: Date }; plan: Plan | null }> {
  await authorize(session, 'coach.use');
  const key = { userId: session.userId, date: asDay(today()) };
  const row = await prismaAs(session).workoutPlan.findUnique({ where: { userId_date: key } });
  return { key, plan: row ? { exerciseIds: jsonStrings(row.exerciseIds), doneIds: jsonStrings(row.doneIds) } : null };
}

function savePlan(session: Session, key: { userId: string; date: Date }, plan: Plan) {
  return prismaAs(session).workoutPlan.upsert({ where: { userId_date: key }, create: { ...key, ...plan }, update: plan });
}

export async function getMyWorkout(session: Session): Promise<MyWorkoutDto> {
  const { plan } = await myPlan(session);
  return {
    date: today(),
    items: (plan?.exerciseIds ?? []).flatMap(id => {
      const e = findExercise(id);
      return e ? [{ ...e, done: plan?.doneIds.includes(id) ?? false }] : [];
    }),
  };
}

export async function addToMyPlan(session: Session, exerciseIds: readonly string[]): Promise<{ added: number; overflow: boolean }> {
  const { key, plan } = await myPlan(session);
  const current = plan ?? { exerciseIds: [], doneIds: [] };
  const r = mergePlan(current.exerciseIds, exerciseIds);
  await savePlan(session, key, { exerciseIds: r.ids, doneIds: current.doneIds });
  return { added: r.added, overflow: r.overflow };
}

export async function setExerciseDone(session: Session, exerciseId: string, done: boolean): Promise<void> {
  const { key, plan } = await myPlan(session);
  if (!plan?.exerciseIds.includes(exerciseId)) throw new Error('NOT_FOUND');
  const doneIds = done ? [...new Set([...plan.doneIds, exerciseId])] : plan.doneIds.filter(id => id !== exerciseId);
  await savePlan(session, key, { exerciseIds: plan.exerciseIds, doneIds });
}

export async function removeFromMyPlan(session: Session, exerciseId: string): Promise<void> {
  const { key, plan } = await myPlan(session);
  if (!plan?.exerciseIds.includes(exerciseId)) throw new Error('NOT_FOUND');
  await savePlan(session, key, { exerciseIds: plan.exerciseIds.filter(id => id !== exerciseId), doneIds: plan.doneIds.filter(id => id !== exerciseId) });
}
