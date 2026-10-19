import 'server-only';
import { headers } from 'next/headers';

/**
 * IP ของผู้ใช้สำหรับ rate limit (§10.6)
 * production ต้องอยู่หลัง Cloudflare/reverse proxy และตั้ง TRUSTED_IP_HEADER=cf-connecting-ip
 * เพราะ x-forwarded-for ที่ไม่มี proxy เขียนทับ ผู้ใช้ปลอมค่าได้เอง
 */
export async function clientIp(): Promise<string> {
  const name = process.env.TRUSTED_IP_HEADER ?? 'x-forwarded-for';
  const value = (await headers()).get(name);
  return value?.split(',')[0]?.trim() || 'unknown';
}
