'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { CHANGE_PASSWORD_PATH, getSession, requireSignedIn, signIn, signOut } from '@/api/lib/auth/auth/auth.session';
import { changeOwnPassword, MIN_OWN_PASSWORD } from '@/api/lib/auth/auth/auth.accounts';
import { requestPasswordReset } from '@/api/dal/users/users/users.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { LOCKOUT_MINUTES, landingFor, safeNextPath } from '@/api/services/auth/auth/auth.service';

const LoginSchema = z.object({
  identifier: z.string().trim().min(3, 'กรอกอีเมลหรือเบอร์มือถือ').max(120, 'ยาวเกินไป'),
  password: z.string().min(1, 'กรอกรหัสผ่าน').max(200, 'ยาวเกินไป'),
  remember: z.literal('on').optional(),
  next: z.string().optional(),
});

/** เข้าสู่ระบบ — บทบาทมาจากบัญชีในระบบหลังบ้าน แล้วพาไปหน้าแรกของบทบาทนั้น */
export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { identifier, password, remember, next } = parsed.data;
  const result = await signIn(identifier, password, remember === 'on');
  if (!result.ok) {
    // ไม่บอกว่าผิดที่ชื่อผู้ใช้หรือรหัสผ่าน เพื่อไม่ให้เดาได้ว่าบัญชีมีอยู่จริง
    return result.reason === 'locked'
      ? { ok: false, message: `ใส่รหัสผ่านผิดหลายครั้ง บัญชีนี้ถูกล็อก ${String(LOCKOUT_MINUTES)} นาที ลองใหม่ภายหลัง หรือติดต่อผู้จัดการสาขา` }
      : { ok: false, message: 'อีเมล/เบอร์มือถือ หรือรหัสผ่านไม่ถูกต้อง' };
  }
  await audit(result.session, 'auth.login', 'user', result.session.userId);
  // รหัสเริ่มต้น → ต้องเปลี่ยนรหัสผ่านก่อน
  if (result.session.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);
  const target = safeNextPath(next);
  // สมาชิกเข้าหน้าของพนักงานไม่ได้ จึงไม่ใช้ next ที่เป็นหน้าหลังบ้าน
  redirect(target && (result.session.role !== 'member' || target.startsWith('/me')) ? target : landingFor(result.session.role));
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) await audit(session, 'auth.logout', 'user', session.userId);
  await signOut();
  redirect('/login');
}

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(MIN_OWN_PASSWORD, `รหัสผ่านต้องมีอย่างน้อย ${String(MIN_OWN_PASSWORD)} ตัว`).max(200, 'รหัสผ่านต้องไม่เกิน 200 ตัวอักษร'),
  confirmPassword: z.string().max(200, 'ยาวเกินไป'),
}).refine(v => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'รหัสผ่านไม่ตรงกัน' });

/** ตั้งรหัสผ่านใหม่ (ขั้นที่ 2 ของหน้าเข้าสู่ระบบ) แล้วออกจากระบบทุกเครื่อง — ต้องเข้าสู่ระบบใหม่ด้วยรหัสใหม่ */
export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSignedIn();
  const parsed = ChangePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    // null = ไม่เก็บ session ไหนไว้ (รวมเครื่องนี้)
    await changeOwnPassword(session.userId, parsed.data.newPassword, null);
  } catch (error) {
    if (error instanceof Error && error.message === 'PASSWORD_UNCHANGED') return { ok: false, message: 'ตั้งรหัสใหม่ที่ไม่ซ้ำรหัสเดิม', fieldErrors: { newPassword: 'ซ้ำกับรหัสเดิม' } };
    return knownFailure(error);
  }
  await audit(session, 'auth.password.change', 'user', session.userId, { after: { forced: Boolean(session.mustChangePassword) } });
  await signOut();
  redirect('/login?passwordChanged=1');
}

const ForgotSchema = z.object({ identifier: z.string().trim().min(3, 'กรอกอีเมลหรือเบอร์โทรที่ใช้เข้าสู่ระบบ').max(120, 'ยาวเกินไป') });

/** (สาธารณะ) ลืมรหัสผ่าน — ส่งคำขอให้พนักงานรีเซ็ต · ตอบข้อความเดียวกันเสมอ ไม่บอกว่าบัญชีมีจริงไหม */
export async function requestPasswordResetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = ForgotSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  await requestPasswordReset(parsed.data.identifier);
  return { ok: true, message: 'ส่งคำขอแล้ว — ติดต่อเคาน์เตอร์หรือผู้จัดการสาขาเพื่อรับรหัสผ่านชั่วคราว แล้วเข้าสู่ระบบเพื่อตั้งรหัสใหม่' };
}
