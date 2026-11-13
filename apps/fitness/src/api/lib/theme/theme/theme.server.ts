import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_THEME, DEFAULT_THEME_MODE, isTheme, isThemeMode, THEME_COOKIE, THEME_MODE_COOKIE, type Theme, type ThemeMode } from '@/api/services/theme/theme/theme.themes';

export async function currentTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

export async function currentThemeMode(): Promise<ThemeMode> {
  const jar = await cookies();
  const value = jar.get(THEME_MODE_COOKIE)?.value;
  if (isThemeMode(value)) return value;
  return jar.get(THEME_COOKIE)?.value === 'light' ? 'light' : DEFAULT_THEME_MODE;
}
