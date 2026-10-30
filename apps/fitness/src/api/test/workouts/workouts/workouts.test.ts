import { describe, expect, it } from 'vitest';
import { EXERCISES, exercisesFor, MUSCLES } from '@/api/services/workouts/workouts/workouts.catalog';
import { MAX_PLAN, mergePlan, planMinutes } from '@/api/services/workouts/workouts/workouts.service';

describe('คลังท่าฝึก', () => {
  it('กล้ามเนื้อทุกมัดมีอย่างน้อย 2 ท่า และ id ไม่ซ้ำ', () => {
    for (const m of MUSCLES) expect(exercisesFor([m]).length).toBeGreaterThanOrEqual(2);
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
  });
  it('เลือกทีละมัด: ปีกไม่ได้ท่าของหลังล่าง', () => {
    const ids = exercisesFor(['lats']).map(e => e.id);
    expect(ids).toContain('lat-pulldown');
    expect(ids).not.toContain('back-extension');
  });
  it('อกบน/อกล่าง และหน้าท้องบน/ล่าง ได้ท่าคนละชุด', () => {
    expect(exercisesFor(['upper-chest']).map(e => e.id)).not.toContain('decline-bench-press');
    expect(exercisesFor(['lower-chest']).map(e => e.id)).not.toContain('incline-db-press');
    expect(exercisesFor(['lower-abs']).map(e => e.id)).not.toContain('crunch');
    expect(exercisesFor(['upper-abs']).map(e => e.id)).not.toContain('leg-raise');
  });
  it('ท่าที่มีมัดที่เลือกเป็นเป้าหลักขึ้นก่อนท่าที่ได้เสริม', () => {
    const list = exercisesFor(['triceps']);
    expect(list[0]?.muscles[0]).toBe('triceps');
    expect(list.at(-1)?.muscles[0]).not.toBe('triceps');
  });
});

describe('โปรแกรมวันนี้', () => {
  it('เพิ่มท่าใหม่ ข้ามท่าซ้ำและท่าที่ไม่รู้จัก', () => {
    expect(mergePlan(['squat'], ['squat', 'plank', 'unknown'])).toEqual({ ids: ['squat', 'plank'], added: 1, overflow: false });
  });
  it(`จำกัด ${String(MAX_PLAN)} ท่าต่อวัน`, () => {
    const r = mergePlan([], EXERCISES.map(e => e.id));
    expect(r.ids).toHaveLength(MAX_PLAN);
    expect(r.overflow).toBe(true);
  });
  it('ประมาณเวลาท่าละ 8 นาที', () => {
    expect(planMinutes(5)).toBe(40);
  });
});
