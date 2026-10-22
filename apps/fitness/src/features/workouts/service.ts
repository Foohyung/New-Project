import { findExercise } from './catalog';

/** โปรแกรมหนึ่งวันมีได้ไม่เกินนี้ (กันกดเพิ่มทุกท่าจนฝึกไม่ไหว) */
export const MAX_PLAN = 12;
/** เวลาโดยประมาณต่อท่า รวมพักระหว่างเซ็ต (นาที) */
export const MINUTES_PER_EXERCISE = 8;

/** รวมท่าใหม่เข้ากับโปรแกรมเดิม: ตัดท่าที่ไม่รู้จักและท่าซ้ำ แล้วจำกัดจำนวน */
export function mergePlan(current: readonly string[], add: readonly string[]): { ids: string[]; added: number; overflow: boolean } {
  const ids = [...current];
  let added = 0;
  let overflow = false;
  for (const id of add) {
    if (!findExercise(id) || ids.includes(id)) continue;
    if (ids.length >= MAX_PLAN) {
      overflow = true;
      break;
    }
    ids.push(id);
    added++;
  }
  return { ids, added, overflow };
}

export function planMinutes(count: number): number {
  return count * MINUTES_PER_EXERCISE;
}
