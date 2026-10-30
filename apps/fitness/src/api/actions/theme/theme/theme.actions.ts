'use server';

import { cookies } from 'next/headers';
import { requireHttps } from '@/api/lib/security/security/security';
import { isTheme, THEME_COOKIE } from '@/api/services/theme/theme/theme.themes';

/** จำธีมที่เลือกไว้ใน cookie เพื่อให้ server render สีถูกตั้งแต่แรก (ไม่กะพริบ) */
export async function setThemeAction(theme: string): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { sameSite: 'lax', secure: requireHttps(), path: '/', maxAge: 60 * 60 * 24 * 365 });
}
