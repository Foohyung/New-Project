/** ธีมของเว็บ — ค่าสีจริงอยู่ใน globals.css ([data-theme=...]) ตรงนี้เก็บเฉพาะข้อมูลสำหรับตัวเลือก */
export const THEMES = ['pulse', 'light', 'ocean', 'sunset'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'sunset';
export const THEME_COOKIE = 'ff-theme';
export const THEME_MODES = ['dark', 'light'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const DEFAULT_THEME_MODE: ThemeMode = 'light';
export const THEME_MODE_COOKIE = 'ff-theme-mode';

export const THEME_MODE_INFO: Record<ThemeMode, { label: string; description: string; scheme: 'dark' | 'light' }> = {
  dark: { label: 'มืด', description: 'พื้นหลังโทนมืด', scheme: 'dark' },
  light: { label: 'สว่าง', description: 'พื้นหลังโทนสว่าง', scheme: 'light' },
};

export const THEME_INFO: Record<Theme, { label: string; description: string; bg: string; accent: string }> = {
  pulse: { label: 'Pulse', description: 'เขียวนีออน', bg: '#0b0d10', accent: '#c6ff3d' },
  light: { label: 'Daylight', description: 'เขียวธรรมชาติ อ่านสบายตา', bg: '#f4f5f7', accent: '#4d7c0f' },
  ocean: { label: 'Ocean', description: 'ฟ้าเทอร์ควอยซ์', bg: '#08111c', accent: '#5eead4' },
  sunset: { label: 'Sunset', description: 'ส้มอบอุ่น (ค่าเริ่มต้น)', bg: '#120d0b', accent: '#ff8a3d' },
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

export function themeBackground(theme: Theme, mode: ThemeMode): string {
  if (mode === 'light') return '#f4f5f7';
  return theme === 'light' ? THEME_INFO.pulse.bg : THEME_INFO[theme].bg;
}
