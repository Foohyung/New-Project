'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { resetStore } from '@/server/db';
import { authorize } from '@/server/rbac';

/** คืนข้อมูลตัวอย่างทั้งหมดเป็นค่าตั้งต้น */
export async function resetDemoAction(): Promise<void> {
  const session = await requireSession();
  await authorize(session, 'demo.reset');
  resetStore();
  await audit(session, 'demo.reset', 'store', 'all');
  revalidatePath('/', 'layout');
  redirect('/');
}
