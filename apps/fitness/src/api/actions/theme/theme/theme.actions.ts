'use server';

import { cookies } from 'next/headers';
import { requireHttps } from '@/api/lib/security/security/security';
import { isTheme, isThemeMode, THEME_COOKIE, THEME_MODE_COOKIE } from '@/api/services/theme/theme/theme.themes';

/** จำธีมที่เลือกไว้ใน cookie เพื่อให้ server render สีถูกตั้งแต่แรก (ไม่กะพริบ) */
export async function setThemeAction(theme: string): Promise<void> {
  if (!isTheme(theme)) throw new Error('INVALID_THEME');
  (await cookies()).set(THEME_COOKIE, theme, { sameSite: 'lax', secure: requireHttps(), path: '/', maxAge: 60 * 60 * 24 * 365 });
}

export async function setThemeModeAction(mode: string): Promise<void> {
  if (!isThemeMode(mode)) throw new Error('INVALID_THEME_MODE');
  (await cookies()).set(THEME_MODE_COOKIE, mode, { sameSite: 'lax', secure: requireHttps(), path: '/', maxAge: 60 * 60 * 24 * 365 });
}
