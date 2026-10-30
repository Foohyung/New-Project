import { normalizePhone } from '@repo/utils';
import { z } from 'zod';
import { PROPERTY_TYPES, UNIT_STATUSES, type Commission } from './types';

const text = (label: string, max = 120) => z.string().trim().min(1, `กรอก${label}`).max(max, `${label}ยาวเกินไป`);
const optionalText = (max = 200) => z.string().trim().max(max, 'ยาวเกินไป').default('');

/** จำนวนเงินจากฟอร์มเป็นบาท (มีจุลภาคได้) → สตางค์ · ช่องว่าง = ไม่มี */
export const moneyField = z
  .string()
  .trim()
  .transform(v => v.replace(/[,\s฿]/g, ''))
  .refine(v => v === '' || /^\d{1,10}(\.\d{1,2})?$/.test(v), 'กรอกจำนวนเงินเป็นตัวเลข')
  .transform(v => (v === '' ? undefined : Math.round(Number(v) * 100)));

const intField = (label: string, min: number, max: number) =>
  z.string().trim().regex(/^\d+$/, `กรอก${label}เป็นตัวเลข`).transform(Number).refine(n => n >= min && n <= max, `${label}ต้องอยู่ระหว่าง ${String(min)}–${String(max)}`);

export const PropertySchema = z.object({
  name: text('ชื่อทรัพย์'),
  type: z.enum(PROPERTY_TYPES, 'เลือกประเภททรัพย์'),
  location: text('ที่ตั้ง', 200),
  province: text('จังหวัด', 60),
  deed: text('เอกสารสิทธิ์', 120),
});
export type PropertyInput = z.infer<typeof PropertySchema>;

export const UnitSchema = z
  .object({
    label: text('เลขห้อง/ยูนิต', 30),
    bedrooms: intField('จำนวนห้องนอน', 0, 20),
    areaSqm: intField('พื้นที่', 1, 100_000),
    landSqWah: z.string().trim().default('').transform(v => (v === '' ? undefined : Number(v))).refine(v => v === undefined || (Number.isInteger(v) && v > 0), 'กรอกตารางวาเป็นจำนวนเต็ม'),
    ownerId: text('เจ้าของ', 40),
    salePrice: moneyField,
    rentPrice: moneyField,
    status: z.enum(UNIT_STATUSES, 'เลือกสถานะ'),
    commissionKind: z.enum(['percent', 'months', 'fixed'], 'เลือกรูปแบบค่าคอม'),
    commissionValue: z.string().trim().min(1, 'กรอกค่าคอมที่ตกลง'),
    exclusive: z.literal('on').optional().transform(v => v === 'on'),
    note: optionalText(),
  })
  .superRefine((v, ctx) => {
    if (v.salePrice === undefined && v.rentPrice === undefined) ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'กรอกราคาขายหรือค่าเช่าอย่างน้อย 1 อย่าง' });
    const n = Number(v.commissionValue.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ code: 'custom', path: ['commissionValue'], message: 'กรอกค่าคอมเป็นตัวเลขมากกว่า 0' });
    else if (v.commissionKind === 'percent' && n > 10) ctx.addIssue({ code: 'custom', path: ['commissionValue'], message: 'ค่าคอมไม่ควรเกิน 10%' });
    else if (v.commissionKind === 'months' && (!Number.isInteger(n) || n > 6)) ctx.addIssue({ code: 'custom', path: ['commissionValue'], message: 'จำนวนเดือนต้องเป็นจำนวนเต็ม 1–6' });
  })
  .transform(({ commissionKind, commissionValue, ...rest }) => {
    const n = Number(commissionValue.replace(/,/g, ''));
    const commission: Commission =
      commissionKind === 'percent' ? { kind: 'percent', basisPoints: Math.round(n * 100) } : commissionKind === 'months' ? { kind: 'months', months: n } : { kind: 'fixed', satang: Math.round(n * 100) };
    return { ...rest, commission };
  });
export type UnitInput = z.infer<typeof UnitSchema>;

export const StatusSchema = z.object({
  unitId: text('ยูนิต', 40),
  status: z.enum(UNIT_STATUSES, 'เลือกสถานะ'),
  leaseEnd: z.string().trim().default('').refine(v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'วันที่ไม่ถูกต้อง'),
});

const phone = z.string().trim().transform(normalizePhone).refine(v => /^0\d{8,9}$/.test(v), 'เบอร์โทรไม่ถูกต้อง').transform(v => (v.length === 10 ? `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}` : `${v.slice(0, 2)}-${v.slice(2, 5)}-${v.slice(5)}`));

export const OwnerSchema = z.object({
  name: text('ชื่อเจ้าของ'),
  kind: z.enum(['person', 'company'], 'เลือกประเภทเจ้าของ'),
  phone,
  lineId: optionalText(50),
  email: z.string().trim().max(120).refine(v => v === '' || z.email().safeParse(v).success, 'อีเมลไม่ถูกต้อง').default(''),
  taxId: text('เลขบัตร/ทะเบียน', 30),
  address: text('ที่อยู่', 300),
  listing: z.enum(['sale', 'rent', 'both'], 'เลือกประเภทการฝาก'),
  status: z.enum(['active', 'paused', 'ended'], 'เลือกสถานะ'),
  note: optionalText(300),
});
export type OwnerInput = z.infer<typeof OwnerSchema>;

export const ClientSchema = z.object({
  name: text('ชื่อลูกค้า'),
  phone,
  idNumber: text('เลขบัตร/พาสปอร์ต', 30),
  address: text('ที่อยู่', 300),
  interest: z.enum(['buy', 'rent'], 'เลือกความสนใจ'),
});
export type ClientInput = z.infer<typeof ClientSchema>;
