import { toSatang } from '@/api/lib/utils/utils/utils';
import { z } from 'zod';

export const PACKAGE_KINDS = ['time', 'pt', 'daypass'] as const;
export type PackageKindInput = (typeof PACKAGE_KINDS)[number];

/** ระยะของแพ็กเกจแต่ละประเภท: time = เดือน · daypass = วัน · pt = ครั้ง */
export const DURATION_LIMIT: Record<PackageKindInput, { unit: string; max: number }> = {
  time: { unit: 'เดือน', max: 36 },
  daypass: { unit: 'วัน', max: 365 },
  pt: { unit: 'ครั้ง', max: 200 },
};

const fields = {
  name: z.string().trim().min(2, 'กรอกชื่อแพ็กเกจอย่างน้อย 2 ตัวอักษร').max(120, 'ชื่อแพ็กเกจยาวเกินไป'),
  kind: z.enum(PACKAGE_KINDS, { error: 'เลือกประเภทแพ็กเกจ' }),
  duration: z.coerce.number({ error: 'กรอกระยะเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(1, 'ระยะต้องอย่างน้อย 1'),
  price: z.coerce
    .number({ error: 'กรอกราคาเป็นตัวเลข' })
    .positive('ราคาต้องมากกว่า 0')
    .max(100_000, 'ราคาไม่เกิน ฿100,000')
    .transform(toSatang),
  description: z.string().trim().min(2, 'กรอกรายละเอียดสั้น ๆ').max(120, 'รายละเอียดยาวเกินไป'),
  active: z.literal('on').optional().transform(v => v === 'on'),
};

const durationWithinLimit = (v: { kind: PackageKindInput; duration: number }, ctx: z.RefinementCtx) => {
  const { unit, max } = DURATION_LIMIT[v.kind];
  if (v.duration > max) ctx.addIssue({ code: 'custom', path: ['duration'], message: `ไม่เกิน ${String(max)} ${unit}` });
};

export const PackageCreateSchema = z.object(fields).superRefine(durationWithinLimit);

/** แก้ไข — ประเภทแพ็กเกจเปลี่ยนไม่ได้ (ส่งมาเป็น hidden เพื่อใช้ตรวจระยะ · DAL ใช้ค่าจากฐานข้อมูล) */
export const PackageUpdateSchema = z.object({ id: z.string().min(1), ...fields }).superRefine(durationWithinLimit);

export type PackageInput = z.output<typeof PackageCreateSchema>;
