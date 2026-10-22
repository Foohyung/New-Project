import { z } from 'zod';
import { ACTIVITIES, GOALS, SEXES } from './service';

const num = (label: string, min: number, max: number, unit: string) =>
  z.coerce.number({ error: `กรอก${label}เป็นตัวเลข` }).min(min, `${label}ต้องอยู่ระหว่าง ${String(min)}–${String(max)} ${unit}`).max(max, `${label}ต้องอยู่ระหว่าง ${String(min)}–${String(max)} ${unit}`);

/** ข้อมูลร่างกาย + ความยินยอมแยกเฉพาะข้อมูลสุขภาพ (PDPA ม.26) — ไม่ติ๊กยินยอม = ไม่บันทึก */
export function healthProfileSchema(year: number) {
  return z.object({
    sex: z.enum(SEXES, { error: 'เลือกเพศ (ใช้คำนวณการเผาผลาญ)' }),
    birthYear: z.coerce.number({ error: 'กรอกปีเกิด ค.ศ.' }).int('กรอกปีเกิด ค.ศ.').min(year - 90, `กรอกปีเกิด ค.ศ. ระหว่าง ${String(year - 90)}–${String(year - 15)}`).max(year - 15, 'ใช้ได้สำหรับอายุ 15 ปีขึ้นไป'),
    heightCm: num('ส่วนสูง', 120, 220, 'ซม.'),
    weightKg: num('น้ำหนัก', 30, 200, 'กก.'),
    goal: z.enum(GOALS, { error: 'เลือกเป้าหมาย' }),
    activity: z.enum(ACTIVITIES, { error: 'เลือกระดับการออกกำลัง' }),
    healthConsent: z.literal('on', { error: 'ต้องยินยอมให้เก็บข้อมูลสุขภาพก่อน จึงคำนวณเป้าอาหารได้' }),
  });
}

/** บันทึกมื้อที่กิน: เลือกจากเมนูแนะนำ (mealId) หรือกรอกเอง */
export const CustomMealSchema = z.object({
  name: z.string().trim().min(2, 'กรอกชื่อเมนู').max(60, 'ชื่อเมนูยาวเกินไป'),
  kcal: num('พลังงาน', 10, 3000, 'kcal'),
  proteinG: z.coerce.number().min(0).max(300).catch(0),
});
