import { z } from 'zod';
import { TimeSchema } from '@/api/schemas/classes/classes/classes.schema';

export const TRAINER_COLORS = ['var(--color-lime)', 'var(--color-cyan)', 'var(--color-violet)', 'var(--color-warn)', 'var(--color-danger)'] as const;

const trainerFields = {
  name: z.string().trim().min(2, 'กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร').max(120, 'ชื่อยาวเกินไป'),
  nickname: z.string().trim().min(1, 'กรอกชื่อเล่น').max(60, 'ชื่อเล่นยาวเกินไป'),
  // คั่นด้วยจุลภาค เช่น "HIIT, Yoga" → ["HIIT", "Yoga"]
  specialties: z.string().optional().transform(v => [...new Set((v ?? '').split(/[,،\n]/).map(s => s.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(30, 'แต่ละความถนัดไม่เกิน 30 ตัวอักษร')).max(8, 'ใส่ความถนัดได้ไม่เกิน 8 อย่าง')),
  bio: z.string().trim().max(1000, 'ประวัติยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)').optional().transform(v => v ?? ''),
  color: z.enum(TRAINER_COLORS, { error: 'เลือกสี' }),
};

export const TrainerCreateSchema = z.object(trainerFields);
export const TrainerUpdateSchema = z.object({ id: z.string().min(1), ...trainerFields });
export type TrainerInput = z.output<typeof TrainerCreateSchema>;

export const PtBookSchema = z.object({
  query: z.string().trim().min(3, 'กรอกเบอร์โทรหรือรหัสสมาชิกอย่างน้อย 3 ตัวอักษร').max(40, 'ข้อความยาวเกินไป'),
  date: z.iso.date({ error: 'เลือกวันที่' }),
  time: TimeSchema,
});
