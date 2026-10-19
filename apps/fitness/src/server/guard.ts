import 'server-only';
import { redirect } from 'next/navigation';
import type { Permission } from '@/features/auth/roles';
import { requireSession, type Session } from './auth';
import { can } from './rbac';

/**
 * ตรวจสิทธิ์ระดับหน้า: สมาชิกที่เปิดหน้าของพนักงานถูกส่งไปหน้าบัตรสมาชิก
 * ส่วนพนักงานที่ไม่มีสิทธิ์จะได้ `allowed: false` ให้หน้าแสดงข้อความแทน
 * (DAL ยังตรวจซ้ำทุก query — หน้านี้มีไว้เพื่อ UX เท่านั้น §10.2)
 */
export async function pageGuard(permission: Permission): Promise<{ session: Session; allowed: boolean }> {
  const session = await requireSession();
  if (can(session, permission)) return { session, allowed: true };
  if (session.role === 'member') redirect('/me');
  return { session, allowed: false };
}
