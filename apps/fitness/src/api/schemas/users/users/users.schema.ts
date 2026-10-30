import { z } from 'zod';

/** ช่องวันที่ว่าง = ไม่จำกัด (null) */
const optionalDay = z.string().trim().refine(v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'วันที่ไม่ถูกต้อง').transform(v => v || null);

const userFields = {
  login: z.string().trim().min(3, 'กรอกอีเมล เบอร์มือถือ หรือรหัสผู้ใช้').max(120, 'ยาวเกินไป'),
  confirmPassword: z.string().max(200, 'รหัสผ่านต้องไม่เกิน 200 ตัวอักษร'),
  name: z.string().trim().min(2, 'กรอกชื่ออย่างน้อย 2 ตัวอักษร').max(120, 'ยาวเกินไป'),
  nickname: z.string().trim().min(1, 'กรอกชื่อเล่น').max(60, 'ยาวเกินไป'),
  role: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/, 'เลือกบทบาทผู้ใช้'),
  branch: z.string().trim().min(1, 'กรอกชื่อสาขา').max(120, 'ยาวเกินไป'),
  trainerId: z.string().optional(),
  memberId: z.string().optional(),
  activeFrom: optionalDay.default(''),
  activeTo: optionalDay.default(''),
};

export const CreateUserSchema = z.object({
  ...userFields,
  password: z.string().min(1, 'กรอกรหัสผ่าน').max(200, 'รหัสผ่านต้องไม่เกิน 200 ตัวอักษร'),
}).superRefine(validateUserRoleLink);

/** (admin) แก้ไขบัญชี — รหัสผ่านเว้นว่าง = ใช้รหัสเดิม · checkbox active ไม่ติ๊ก = ปิดใช้งาน */
export const UpdateUserSchema = z.object({
  ...userFields,
  password: z.string().max(200, 'รหัสผ่านต้องไม่เกิน 200 ตัวอักษร').default(''),
  active: z.string().optional().transform(v => v === 'on'),
}).superRefine(validateUserRoleLink);

export const OwnerBranchSchema = z.object({
  branch: z.string().trim().min(1, 'กรอกชื่อสาขา').max(120, 'ยาวเกินไป'),
});

export function validateUserRoleLink(
  value: { password: string; confirmPassword: string; role: string; trainerId?: string; memberId?: string; activeFrom: string | null; activeTo: string | null },
  context: z.RefinementCtx,
): void {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'รหัสผ่านไม่ตรงกัน' });
  }
  if (value.role === 'trainer' && !value.trainerId) {
    context.addIssue({ code: 'custom', path: ['trainerId'], message: 'เลือกโปรไฟล์เทรนเนอร์' });
  }
  if (value.role === 'member' && !value.memberId) {
    context.addIssue({ code: 'custom', path: ['memberId'], message: 'เลือกสมาชิกที่ต้องการผูกบัญชี' });
  }
  if (value.activeFrom && value.activeTo && value.activeTo < value.activeFrom) {
    context.addIssue({ code: 'custom', path: ['activeTo'], message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มใช้งาน' });
  }
}
