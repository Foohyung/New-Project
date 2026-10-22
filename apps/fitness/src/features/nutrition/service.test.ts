import { describe, expect, it } from 'vitest';
import { dailyTargets, MENU, MIN_KCAL, slotAt, suggestMeals, sumMacros, type BodyProfile } from './service';

const base: BodyProfile = { sex: 'male', birthYear: 1996, heightCm: 175, weightKg: 75, goal: 'maintain', activity: 'moderate' };

describe('เป้าพลังงานต่อวัน', () => {
  it('คงหุ่น = BMR × ระดับกิจกรรม (ปัดหลักสิบ)', () => {
    // BMR = 750 + 1093.75 − 150 + 5 = 1698.75 → × 1.55 = 2633 → 2630
    expect(dailyTargets(base, 2026).kcal).toBe(2630);
  });
  it('ลดไขมันกินน้อยลง 20% และโปรตีน 1.8 กรัม/กก.', () => {
    const t = dailyTargets({ ...base, goal: 'lose' }, 2026);
    expect(t.kcal).toBe(2110);
    expect(t.proteinG).toBe(135);
  });
  it('ไม่ต่ำกว่าขั้นต่ำที่ปลอดภัย', () => {
    const t = dailyTargets({ sex: 'female', birthYear: 1960, heightCm: 145, weightKg: 40, goal: 'lose', activity: 'sedentary' }, 2026);
    expect(t.kcal).toBe(MIN_KCAL.female);
  });
  it('พลังงานจากโปรตีน คาร์บ ไขมัน รวมใกล้เคียงเป้า', () => {
    const t = dailyTargets(base, 2026);
    expect(Math.abs(t.proteinG * 4 + t.carbG * 4 + t.fatG * 9 - t.kcal)).toBeLessThan(15);
  });
});

describe('เมนูแนะนำ', () => {
  it('เลือกมื้อตามเวลา', () => {
    expect(slotAt(7)).toBe('breakfast');
    expect(slotAt(12)).toBe('lunch');
    expect(slotAt(16)).toBe('snack');
    expect(slotAt(19)).toBe('dinner');
  });
  it('แนะนำเฉพาะเมนูของมื้อนั้นที่ไม่เกินพลังงานที่เหลือ เรียงโปรตีนต่อแคลอรีมากก่อน', () => {
    const list = suggestMeals('dinner', 400);
    expect(list.length).toBeGreaterThan(0);
    for (const m of list) {
      expect(m.slots).toContain('dinner');
      expect(m.kcal).toBeLessThanOrEqual(400);
    }
    expect(list[0]?.id).toBe('chicken-salad');
  });
  it('ถึงเป้าแล้วไม่แนะนำเพิ่ม', () => {
    expect(suggestMeals('dinner', 50)).toEqual([]);
  });
  it('รวมสารอาหารหลายมื้อ', () => {
    const two = MENU.slice(0, 2);
    expect(sumMacros(two).kcal).toBe(two.reduce((t, m) => t + m.kcal, 0));
  });
});
