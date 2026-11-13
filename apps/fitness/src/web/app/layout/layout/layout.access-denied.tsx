import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/api/lib/auth/auth/auth.session';
import { deniedTarget, landingFor } from '@/api/services/auth/auth/auth.service';
import { Forbidden } from '@/web/components/ui/ui/ui';

/**
 * เปิดหน้าที่ไม่มีสิทธิ์ (พิมพ์ URL เอง หรือกดลิงก์เก่า) → เด้งกลับหน้าก่อนหน้า พร้อม ?denied=1 ให้ขึ้นแจ้งเตือน
 * ถ้าไม่มีหน้าให้กลับ (เช่น หน้าแรกของตำแหน่งก็คือหน้านี้) จึงแสดงกล่อง "ไม่มีสิทธิ์เข้าถึง" แทน
 */
export async function accessDenied(message?: string) {
  const [h, session] = await Promise.all([headers(), getSession()]);
  const target = deniedTarget(h.get('referer'), h.get('x-pathname') ?? '', session ? landingFor(session.role) : '/login');
  if (target) redirect(target);
  return <Forbidden message={message} />;
}
