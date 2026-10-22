import 'server-only';
import { findExercise, type Exercise } from '@/features/workouts/catalog';
import { mergePlan } from '@/features/workouts/service';
import type { Session } from '../auth';
import { today } from '../clock';
import { db, type WorkoutPlanRecord } from '../db';
import { authorize, ForbiddenError } from '../rbac';

export interface MyWorkoutDto {
  date: string;
  items: (Exercise & { done: boolean })[];
}

/* ทุกบทบาทเห็น/แก้ได้เฉพาะโปรแกรมของบัญชีตัวเอง (userId จาก session — กัน IDOR) */
async function myPlan(session: Session, create: boolean): Promise<WorkoutPlanRecord | undefined> {
  await authorize(session, 'coach.use');
  const { userId } = session;
  const store = db();
  const date = today();
  let plan = store.workoutPlans.find(p => p.userId === userId && p.date === date);
  if (!plan && create) {
    plan = { userId, date, exerciseIds: [], doneIds: [] };
    store.workoutPlans.push(plan);
  }
  return plan;
}

export async function getMyWorkout(session: Session): Promise<MyWorkoutDto> {
  const plan = await myPlan(session, false);
  return {
    date: today(),
    items: (plan?.exerciseIds ?? []).flatMap(id => {
      const e = findExercise(id);
      return e ? [{ ...e, done: plan?.doneIds.includes(id) ?? false }] : [];
    }),
  };
}

export async function addToMyPlan(session: Session, exerciseIds: readonly string[]): Promise<{ added: number; overflow: boolean }> {
  const plan = await myPlan(session, true);
  if (!plan) throw new ForbiddenError();
  const r = mergePlan(plan.exerciseIds, exerciseIds);
  plan.exerciseIds = r.ids;
  return { added: r.added, overflow: r.overflow };
}

export async function setExerciseDone(session: Session, exerciseId: string, done: boolean): Promise<void> {
  const plan = await myPlan(session, false);
  if (!plan?.exerciseIds.includes(exerciseId)) throw new Error('NOT_FOUND');
  plan.doneIds = done ? [...new Set([...plan.doneIds, exerciseId])] : plan.doneIds.filter(id => id !== exerciseId);
}

export async function removeFromMyPlan(session: Session, exerciseId: string): Promise<void> {
  const plan = await myPlan(session, false);
  if (!plan?.exerciseIds.includes(exerciseId)) throw new Error('NOT_FOUND');
  plan.exerciseIds = plan.exerciseIds.filter(id => id !== exerciseId);
  plan.doneIds = plan.doneIds.filter(id => id !== exerciseId);
}
