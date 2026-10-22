/** คำนวณเป้าพลังงาน/สารอาหาร และเมนูไทยที่แนะนำ (pure — ทดสอบได้โดยไม่ต้องมี server) */

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];
export const SEX_LABEL: Record<Sex, string> = { male: 'ชาย', female: 'หญิง' };

export const GOALS = ['lose', 'maintain', 'gain'] as const;
export type Goal = (typeof GOALS)[number];
export const GOAL_INFO: Record<Goal, { label: string; detail: string; factor: number; proteinPerKg: number }> = {
  lose: { label: 'ลดไขมัน', detail: 'กินน้อยกว่าที่ใช้ราว 20% โปรตีนสูงเพื่อรักษากล้าม', factor: 0.8, proteinPerKg: 1.8 },
  maintain: { label: 'คงหุ่น / สุขภาพ', detail: 'กินเท่าที่ใช้ เน้นสมดุล', factor: 1, proteinPerKg: 1.4 },
  gain: { label: 'เพิ่มกล้าม', detail: 'กินมากกว่าที่ใช้ราว 10% โปรตีนสูง', factor: 1.1, proteinPerKg: 2 },
};

export const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active'] as const;
export type Activity = (typeof ACTIVITIES)[number];
export const ACTIVITY_INFO: Record<Activity, { label: string; factor: number }> = {
  sedentary: { label: 'นั่งทำงาน แทบไม่ได้ออกกำลัง', factor: 1.2 },
  light: { label: 'ออกกำลัง 1–3 วัน/สัปดาห์', factor: 1.375 },
  moderate: { label: 'ออกกำลัง 3–5 วัน/สัปดาห์', factor: 1.55 },
  active: { label: 'ออกกำลัง 6–7 วัน/สัปดาห์', factor: 1.725 },
};

export interface BodyProfile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: Activity;
}

export interface Macros {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** พลังงานขั้นต่ำต่อวันที่ไม่ควรกินต่ำกว่า (ไม่มีผู้เชี่ยวชาญดูแล) */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** เป้าต่อวัน: BMR (Mifflin-St Jeor) × ระดับกิจกรรม × เป้าหมาย · ไขมัน 25% ของพลังงาน · คาร์บเป็นส่วนที่เหลือ */
export function dailyTargets(p: BodyProfile, year: number): Macros {
  const age = year - p.birthYear;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + (p.sex === 'male' ? 5 : -161);
  const raw = bmr * ACTIVITY_INFO[p.activity].factor * GOAL_INFO[p.goal].factor;
  const kcal = Math.max(MIN_KCAL[p.sex], Math.round(raw / 10) * 10);
  const proteinG = Math.round(p.weightKg * GOAL_INFO[p.goal].proteinPerKg);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { kcal, proteinG, carbG, fatG };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce((t, m) => ({ kcal: t.kcal + m.kcal, proteinG: t.proteinG + m.proteinG, carbG: t.carbG + m.carbG, fatG: t.fatG + m.fatG }), { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });
}

export const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = { breakfast: 'มื้อเช้า', lunch: 'มื้อกลางวัน', snack: 'ของว่าง', dinner: 'มื้อเย็น' };

/** มื้อที่ควรแนะนำตามเวลา (ชั่วโมงในเวลาไทย) */
export function slotAt(hour: number): Slot {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

export interface Meal extends Macros {
  id: string;
  name: string;
  detail: string;
  emoji: string;
  slots: readonly Slot[];
}

/** เมนูหาง่ายในไทย (ค่าประมาณต่อหนึ่งที่) */
export const MENU: readonly Meal[] = [
  { id: 'jok-pork', name: 'โจ๊กหมูใส่ไข่', detail: 'ชามกลาง', emoji: '🥣', slots: ['breakfast'], kcal: 320, proteinG: 18, carbG: 42, fatG: 8 },
  { id: 'khao-tom-egg', name: 'ข้าวต้มไข่ + นมจืด', detail: 'ข้าวต้มหมูสับ 1 ชาม + นม 1 กล่อง', emoji: '🍳', slots: ['breakfast'], kcal: 380, proteinG: 22, carbG: 48, fatG: 10 },
  { id: 'toast-egg', name: 'ขนมปังโฮลวีต + ไข่ต้ม 2 ฟอง', detail: 'ขนมปัง 2 แผ่น', emoji: '🍞', slots: ['breakfast', 'snack'], kcal: 300, proteinG: 18, carbG: 28, fatG: 11 },
  { id: 'greek-yogurt', name: 'กรีกโยเกิร์ต + กล้วย', detail: 'โยเกิร์ตไม่หวาน 1 ถ้วย', emoji: '🥛', slots: ['breakfast', 'snack'], kcal: 220, proteinG: 15, carbG: 32, fatG: 3 },
  { id: 'kaprao-chicken', name: 'กะเพราอกไก่ ไข่ต้ม', detail: 'ข้าวครึ่งจาน', emoji: '🍗', slots: ['lunch', 'dinner'], kcal: 480, proteinG: 38, carbG: 50, fatG: 13 },
  { id: 'khao-man-kai', name: 'ข้าวมันไก่ (ไก่ต้ม ไม่เอาหนัง)', detail: 'ข้าวสวยแทนข้าวมัน', emoji: '🍚', slots: ['lunch', 'dinner'], kcal: 450, proteinG: 32, carbG: 58, fatG: 9 },
  { id: 'chicken-salad', name: 'สลัดอกไก่ย่าง', detail: 'น้ำสลัดใส', emoji: '🥗', slots: ['lunch', 'dinner'], kcal: 320, proteinG: 32, carbG: 18, fatG: 12 },
  { id: 'suki-nam', name: 'สุกี้น้ำรวมมิตร', detail: 'ไม่ใส่วุ้นเส้น', emoji: '🍲', slots: ['lunch', 'dinner'], kcal: 350, proteinG: 28, carbG: 22, fatG: 14 },
  { id: 'kuay-teow-nam', name: 'ก๋วยเตี๋ยวเส้นเล็กน้ำใส ลูกชิ้น', detail: 'ชามปกติ', emoji: '🍜', slots: ['lunch', 'dinner'], kcal: 380, proteinG: 22, carbG: 52, fatG: 8 },
  { id: 'grilled-fish', name: 'ปลานิลย่างเกลือ + ข้าวกล้อง', detail: 'ครึ่งตัว ข้าว 1 ทัพพี', emoji: '🐟', slots: ['lunch', 'dinner'], kcal: 420, proteinG: 40, carbG: 35, fatG: 12 },
  { id: 'tom-yum-shrimp', name: 'ต้มยำกุ้งน้ำใส + ข้าว', detail: 'ข้าว 1 ทัพพี', emoji: '🦐', slots: ['lunch', 'dinner'], kcal: 360, proteinG: 26, carbG: 38, fatG: 9 },
  { id: 'larb-chicken', name: 'ลาบไก่ + ข้าวเหนียว', detail: 'ข้าวเหนียว 1 ปั้นเล็ก', emoji: '🥬', slots: ['lunch', 'dinner'], kcal: 420, proteinG: 30, carbG: 45, fatG: 11 },
  { id: 'whey', name: 'เวย์โปรตีน 1 สกู๊ป', detail: 'ผสมน้ำเปล่า', emoji: '🥤', slots: ['snack'], kcal: 120, proteinG: 24, carbG: 3, fatG: 1 },
  { id: 'soy-milk-egg', name: 'นมถั่วเหลืองไม่หวาน + ไข่ต้ม', detail: '1 กล่อง + 1 ฟอง', emoji: '🥚', slots: ['snack'], kcal: 180, proteinG: 14, carbG: 8, fatG: 9 },
  { id: 'fruit', name: 'ผลไม้รวม', detail: 'ฝรั่ง แตงโม มะละกอ 1 ถ้วย', emoji: '🍉', slots: ['snack'], kcal: 90, proteinG: 1, carbG: 22, fatG: 0 },
];

const MENU_BY_ID = new Map(MENU.map(m => [m.id, m]));

export function findMeal(id: string): Meal | undefined {
  return MENU_BY_ID.get(id);
}

/** แนะนำเมนูของมื้อนี้ที่ไม่เกินพลังงานที่เหลือ เรียงตามโปรตีนต่อแคลอรี (อิ่มนาน รักษากล้าม) */
export function suggestMeals(slot: Slot, remainingKcal: number, limit = 3): Meal[] {
  if (remainingKcal < 80) return [];
  return MENU.filter(m => m.slots.includes(slot) && m.kcal <= remainingKcal)
    .sort((a, b) => b.proteinG / b.kcal - a.proteinG / a.kcal)
    .slice(0, limit);
}
