import { z } from 'zod';

const branchFields = {
  name: z.string().trim().min(2, 'กรอกชื่อสาขาอย่างน้อย 2 ตัวอักษร').max(120, 'ชื่อสาขายาวเกินไป'),
  address: z.string().trim().max(500, 'ที่อยู่ยาวเกินไป').transform(v => v || null),
  /** เก็บเฉพาะตัวเลข (ตัดขีด/ช่องว่าง) · เว้นว่างได้ */
  phone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => v === '' || /^\d{9,10}$/.test(v), 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก').transform(v => v || null),
};

export const CreateBranchSchema = z.object({ ...branchFields });

/** checkbox active ไม่ติ๊ก = ปิดใช้งาน */
export const UpdateBranchSchema = z.object({
  id: z.string().min(1),
  ...branchFields,
  active: z.string().optional().transform(v => v === 'on'),
});

export type BranchInput = z.infer<typeof CreateBranchSchema>;
