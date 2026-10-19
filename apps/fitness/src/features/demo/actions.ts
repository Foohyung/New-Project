'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEMO_ROLE_COOKIE, requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { resetStore } from '@/server/db';
import { authorize } from '@/server/rbac';
import { isRole } from '../auth/roles';

/** สลับบทบาทในโหมดเดโม (ระยะที่ 2 แทนด้วยการ login จริง) */
export async function switchRoleAction(formData: FormData): Promise<void> {
  const role = formData.get('role');
  if (!isRole(role)) return;
  (await cookies()).set(DEMO_ROLE_COOKIE, role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
  revalidatePath('/', 'layout');
  redirect(role === 'member' ? '/me' : role === 'trainer' ? '/classes' : '/');
}

/** คืนข้อมูลตัวอย่างทั้งหมดเป็นค่าตั้งต้น */
export async function resetDemoAction(): Promise<void> {
  const session = await requireSession();
  await authorize(session, 'demo.reset');
  resetStore();
  await audit(session, 'demo.reset', 'store', 'all');
  revalidatePath('/', 'layout');
  redirect('/');
}
