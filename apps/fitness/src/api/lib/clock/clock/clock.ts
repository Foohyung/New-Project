import 'server-only';
import { bangkokDate } from '@/api/lib/utils/utils/utils';

/**
 * เวลาปัจจุบันของระบบ — ใช้เวลาจริง
 * ตั้ง DEMO_CLOCK=on เพื่อตรึงเวลาไว้ที่ 15 ต.ค. 2569 18:42 น. (ให้ตรงกับข้อมูลตัวอย่างใน prisma/sample-data.mjs)
 */
export function now(): Date {
  return process.env.DEMO_CLOCK === 'on' ? new Date('2026-10-15T11:42:00Z') : new Date();
}

export function today(): string {
  return bangkokDate(now());
}
