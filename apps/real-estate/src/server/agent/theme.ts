import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from '@/features/theme/themes';

export async function currentTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
