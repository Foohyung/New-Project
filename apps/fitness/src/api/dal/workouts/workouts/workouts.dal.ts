import 'server-only';
import { findExercise, type Exercise } from '@/api/services/workouts/workouts/workouts.catalog';
import { mergePlan, workoutSetCount } from '@/api/services/workouts/workouts/workouts.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { today } from '@/api/lib/clock/clock/clock';
import { asDay, jsonStrings, prismaAs } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';

export interface MyWorkoutDto {
  date: string;
  items: (Exercise & { completedSets: number[]; done: boolean })[];
}

interface Plan {
  exerciseIds: string[];
  doneIds: string[];
  setProgress: Record<string, number[]>;
}

function readSetProgress(value: unknown): Record<string, number[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, sets]) => Array.isArray(sets)
      ? [[id, sets.filter((set): set is number => typeof set === 'number' && Number.isSafeInteger(set) && set > 0)]]
      : []),
  );
}

function completedSetsFor(exercise: Exercise, plan: Plan): number[] {
  const saved = plan.setProgress[exercise.id];
  if (saved !== undefined) return saved.filter(set => set <= workoutSetCount(exercise.sets));
  return plan.doneIds.includes(exercise.id)
    ? Array.from({ length: workoutSetCount(exercise.sets) }, (_, index) => index + 1)
    : [];
}

/* ทุกบทบาทเห็น/แก้ได้เฉพาะโปรแกรมของบัญชีตัวเอง (userId จาก session — กัน IDOR) */
async function myPlan(session: Session): Promise<{ key: { userId: string; date: Date }; plan: Plan | null }> {
  await authorize(session, 'coach.use');
  const key = { userId: session.userId, date: asDay(today()) };
  const row = await prismaAs(session).workoutPlan.findUnique({ where: { userId_date: key } });
  return {
    key,
    plan: row
      ? { exerciseIds: jsonStrings(row.exerciseIds), doneIds: jsonStrings(row.doneIds), setProgress: readSetProgress(row.setProgress) }
      : null,
  };
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
      if (!e || !plan) return [];
      const completedSets = completedSetsFor(e, plan);
      return [{ ...e, completedSets, done: completedSets.length === workoutSetCount(e.sets) }];
    }),
  };
}

export async function addToMyPlan(session: Session, exerciseIds: readonly string[]): Promise<{ added: number; overflow: boolean }> {
  const { key, plan } = await myPlan(session);
  const current = plan ?? { exerciseIds: [], doneIds: [], setProgress: {} };
  const r = mergePlan(current.exerciseIds, exerciseIds);
  await savePlan(session, key, { ...current, exerciseIds: r.ids });
  return { added: r.added, overflow: r.overflow };
}

export async function toggleWorkoutSet(session: Session, exerciseId: string, setNumber: number): Promise<void> {
  const { key, plan } = await myPlan(session);
  const exercise = findExercise(exerciseId);
  if (!plan?.exerciseIds.includes(exerciseId) || !exercise) throw new Error('NOT_FOUND');
  const setCount = workoutSetCount(exercise.sets);
  if (!Number.isSafeInteger(setNumber) || setNumber < 1 || setNumber > setCount) throw new Error('INVALID_SET');
  const completedSets = completedSetsFor(exercise, plan);
  const nextCompletedSets = completedSets.includes(setNumber)
    ? completedSets.filter(set => set !== setNumber)
    : [...completedSets, setNumber].sort((a, b) => a - b);
  const setProgress = { ...plan.setProgress, [exerciseId]: nextCompletedSets };
  const doneIds = nextCompletedSets.length === setCount
    ? [...new Set([...plan.doneIds, exerciseId])]
    : plan.doneIds.filter(id => id !== exerciseId);
  await savePlan(session, key, { exerciseIds: plan.exerciseIds, doneIds, setProgress });
}

export async function removeFromMyPlan(session: Session, exerciseId: string): Promise<void> {
  const { key, plan } = await myPlan(session);
  if (!plan?.exerciseIds.includes(exerciseId)) throw new Error('NOT_FOUND');
  const { [exerciseId]: _removed, ...setProgress } = plan.setProgress;
  await savePlan(session, key, { exerciseIds: plan.exerciseIds.filter(id => id !== exerciseId), doneIds: plan.doneIds.filter(id => id !== exerciseId), setProgress });
}

export async function clearMyPlan(session: Session): Promise<void> {
  const { key } = await myPlan(session);
  await prismaAs(session).workoutPlan.deleteMany({ where: key });
}
