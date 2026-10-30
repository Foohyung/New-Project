'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/server/agent/audit';
import { getSession, signIn, signOut } from '@/server/agent/auth';
import { formObject, validationFailure, type ActionResult } from '../shared/action-result';
import { AGENT_HOME, LOCKOUT_MINUTES, LOGIN_PATH, safeNextPath } from './service';

const LoginSchema = z.object({
  email: z.string().trim().min(3, 'กรอกอีเมล').max(120, 'ยาวเกินไป'),
  password: z.string().min(1, 'กรอกรหัสผ่าน').max(200, 'ยาวเกินไป'),
  next: z.string().optional(),
});

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // ไม่บอกว่าผิดที่อีเมลหรือรหัสผ่าน เพื่อไม่ให้เดาได้ว่าบัญชีมีอยู่จริง
    return result.reason === 'locked'
      ? { ok: false, message: `ใส่รหัสผ่านผิดหลายครั้ง บัญชีถูกล็อก ${String(LOCKOUT_MINUTES)} นาที ลองใหม่ภายหลัง` }
      : { ok: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  }
  audit(result.session, 'auth.login', 'user', result.session.userId);
  redirect(safeNextPath(parsed.data.next) ?? AGENT_HOME);
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) audit(session, 'auth.logout', 'user', session.userId);
  await signOut();
  redirect(LOGIN_PATH);
}
