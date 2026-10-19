import 'server-only';
import { bangkokDate } from '@repo/utils';

/** ระยะที่ 1 ตรึงเวลาไว้ที่ข้อมูลตัวอย่าง (15 ต.ค. 2569 18:42 น.) — ตั้ง DEMO_CLOCK=off เพื่อใช้เวลาจริง */
export function now(): Date {
  return process.env.DEMO_CLOCK === 'off' ? new Date() : new Date('2026-10-15T11:42:00Z');
}

export function today(): string {
  return bangkokDate(now());
}
