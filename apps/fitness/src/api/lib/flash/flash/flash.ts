import 'server-only';
import { cookies } from 'next/headers';
import { requireHttps } from '@/api/lib/security/security/security';
import { DELETED_FLASH_COOKIE, DELETED_FLASH_MAX_AGE } from '@/api/services/shared/shared/shared.flash';

/** เก็บชื่อสิ่งที่ลบไว้ใน cookie อายุสั้นให้ popup อ่าน แล้วคืน path ปลายทางพร้อม ?deleted=1 (ไม่มีชื่อใน URL) */
export async function deletedRedirectPath(path: string, name: string): Promise<string> {
  (await cookies()).set(DELETED_FLASH_COOKIE, encodeURIComponent(name.slice(0, 120)), {
    path: '/', maxAge: DELETED_FLASH_MAX_AGE, sameSite: 'lax', secure: requireHttps(), httpOnly: false,
  });
  return `${path}${path.includes('?') ? '&' : '?'}deleted=1`;
}
