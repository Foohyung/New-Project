import 'server-only';
import { bangkokDate } from '@repo/utils';

/** เวลาปัจจุบันของหลังบ้าน — ระยะที่ 1 ตรึงไว้ที่ 24 ต.ค. 2569 ให้ตรงกับข้อมูลตัวอย่าง (ตั้ง DEMO_CLOCK=off เพื่อใช้เวลาจริง) */
export function now(): Date {
  return process.env.DEMO_CLOCK === 'off' ? new Date() : new Date('2026-10-24T03:00:00Z');
}

export function today(): string {
  return bangkokDate(now());
}
