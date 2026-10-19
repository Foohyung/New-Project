import { toSatang } from '@repo/utils';
import { z } from 'zod';

export const PackageUpdateSchema = z.object({
  price: z.coerce
    .number({ error: 'กรอกราคาเป็นตัวเลข' })
    .positive('ราคาต้องมากกว่า 0')
    .max(100_000, 'ราคาไม่เกิน ฿100,000')
    .transform(toSatang),
  description: z.string().trim().min(2, 'กรอกรายละเอียดสั้น ๆ').max(120, 'รายละเอียดยาวเกินไป'),
  active: z.literal('on').optional().transform(v => v === 'on'),
});
