'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/server/audit';
import { getSession, signIn, signOut } from '@/server/auth';
import { formObject, validationFailure, type ActionResult } from '../shared/action-result';
import { LOCKOUT_MINUTES, landingFor, safeNextPath } from './service';

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
