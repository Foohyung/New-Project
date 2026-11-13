import { toSatang } from '@/api/lib/utils/utils/utils';
import { z } from 'zod';

const fields = {
  name: z.string().trim().min(2, 'กรอกชื่อสินค้าอย่างน้อย 2 ตัวอักษร').max(120, 'ชื่อสินค้ายาวเกินไป'),
  category: z.string().trim().min(2, 'กรอกหมวด เช่น เครื่องดื่ม').max(60, 'ชื่อหมวดยาวเกินไป'),
  price: z.coerce.number({ error: 'กรอกราคาเป็นตัวเลข' }).positive('ราคาต้องมากกว่า 0').max(100_000, 'ราคาไม่เกิน ฿100,000').transform(toSatang),
  lowStock: z.coerce.number({ error: 'กรอกเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(0, 'ต้องไม่ติดลบ').max(10_000, 'ไม่เกิน 10,000'),
  active: z.literal('on').optional().transform(v => v === 'on'),
};

export const ProductCreateSchema = z.object({
  ...fields,
  stock: z.coerce.number({ error: 'กรอกเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(0, 'ต้องไม่ติดลบ').max(100_000, 'ไม่เกิน 100,000'),
});
export const ProductUpdateSchema = z.object({ id: z.string().min(1), ...fields });
export type ProductInput = z.output<typeof ProductUpdateSchema>;

/** receive = รับของเข้า (+qty) · adjust = ตั้งจำนวนตามที่นับได้จริง */
export const StockChangeSchema = z.object({
  productId: z.string().min(1),
  mode: z.enum(['receive', 'adjust'], { error: 'เลือกประเภท' }),
  qty: z.coerce.number({ error: 'กรอกจำนวนเป็นตัวเลข' }).int('กรอกเป็นจำนวนเต็ม').min(0, 'ต้องไม่ติดลบ').max(100_000, 'ไม่เกิน 100,000'),
  note: z.string().trim().max(200, 'หมายเหตุยาวเกินไป').optional().transform(v => (v ? v : null)),
}).refine(v => v.mode === 'adjust' || v.qty > 0, { path: ['qty'], message: 'รับเข้าอย่างน้อย 1 ชิ้น' });

const CartItem = z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(999) });

export const SaleSchema = z.object({
  method: z.enum(['cash', 'card', 'promptpay', 'transfer'], { error: 'เลือกวิธีชำระ' }),
  couponCode: z.string().trim().max(40).optional().transform(v => v || null),
  couponProof: z.literal('on').optional().transform(v => v === 'on'),
  items: z.string().transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'ตะกร้าไม่ถูกต้อง' });
      return z.NEVER;
    }
  }).pipe(z.array(CartItem, { error: 'ตะกร้าไม่ถูกต้อง' }).min(1, 'ยังไม่มีสินค้าในตะกร้า').max(50, 'สินค้าในบิลเดียวไม่เกิน 50 รายการ')),
});
