'use server';

import { cookies } from 'next/headers';
import { isTheme, THEME_COOKIE } from './themes';

/** จำธีมไว้ใน cookie ให้ server render สีถูกตั้งแต่แรก */
export async function setThemeAction(theme: string): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
}
