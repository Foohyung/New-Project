/** ธีมของเว็บ — ค่าสีจริงอยู่ใน globals.css ([data-theme=...]) ตรงนี้เก็บเฉพาะข้อมูลสำหรับตัวเลือก */
export const THEMES = ['pulse', 'light', 'ocean', 'sunset'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'pulse';
export const THEME_COOKIE = 'ff-theme';

export const THEME_INFO: Record<Theme, { label: string; description: string; bg: string; accent: string; scheme: 'dark' | 'light' }> = {
  pulse: { label: 'Pulse', description: 'มืด + เขียวนีออน (ค่าเริ่มต้น)', bg: '#0b0d10', accent: '#c6ff3d', scheme: 'dark' },
  light: { label: 'Daylight', description: 'สว่าง อ่านง่ายในที่แดดจัด', bg: '#f4f5f7', accent: '#4d7c0f', scheme: 'light' },
  ocean: { label: 'Ocean', description: 'น้ำเงินเข้ม + ฟ้าเทอร์ควอยซ์', bg: '#08111c', accent: '#5eead4', scheme: 'dark' },
  sunset: { label: 'Sunset', description: 'น้ำตาลเข้ม + ส้มอบอุ่น', bg: '#120d0b', accent: '#ff8a3d', scheme: 'dark' },
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}
