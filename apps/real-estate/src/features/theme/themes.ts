/** ธีมของหลังบ้าน agent (แบบ 2 Marketplace) — ค่าสีจริงอยู่ใน globals.css (.agent / [data-theme=dark] .agent) */
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'light';
export const THEME_COOKIE = 'bh-theme';

export const THEME_INFO: Record<Theme, { label: string; bg: string; scheme: 'light' | 'dark' }> = {
  light: { label: 'สว่าง', bg: '#f9fafb', scheme: 'light' },
  dark: { label: 'มืด', bg: '#0b1220', scheme: 'dark' },
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}
