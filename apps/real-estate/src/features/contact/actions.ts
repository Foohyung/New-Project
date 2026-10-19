'use server';

import { getHome, saveLead } from '@/server/dal/homes';
import { clientIp } from '@/server/client-ip';
import { rateLimit } from '@/server/rate-limit';
import { ContactSchema } from './schema';

export type ContactState =
  | { ok: true; message: string }
  | { ok: false; code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'NOT_FOUND'; message: string; fieldErrors?: Record<string, string> }
  | null;

/** ฟอร์มนัดชม/สอบถามของหน้าสาธารณะ — ไม่ต้อง login แต่มี rate limit + honeypot (§10.6) */
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // 1. ไม่มีการ login สำหรับผู้เยี่ยมชม — จำกัดอัตราต่อ IP แทน (10 ครั้ง/ชม.)
  const ip = await clientIp();
  const limit = rateLimit(`contact:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, code: 'RATE_LIMITED', message: `ส่งบ่อยเกินไป ลองใหม่ในอีก ${Math.ceil(limit.retryAfterSec / 60)} นาที` };

  // 2. Validate
  const parsed = ContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    // bot ที่กรอก honeypot ได้คำตอบเหมือนสำเร็จ เพื่อไม่ให้รู้ว่าถูกกรอง
    if (fieldErrors.website) return { ok: true, message: 'ส่งข้อมูลแล้ว' };
    return { ok: false, code: 'VALIDATION_ERROR', message: 'กรุณาตรวจข้อมูลที่ไฮไลต์', fieldErrors };
  }

  // 3. ตรวจว่าประกาศมีอยู่จริง
  const home = await getHome(parsed.data.homeSlug);
  if (!home) return { ok: false, code: 'NOT_FOUND', message: 'ไม่พบประกาศนี้แล้ว' };

  // 4. Execute — ระยะที่ 2: แจ้ง agent ทาง LINE/อีเมลผ่าน background job
  await saveLead({ homeSlug: home.slug, name: parsed.data.name, phone: parsed.data.phone, message: parsed.data.message }, new Date());
  return { ok: true, message: `ส่งข้อมูลถึง ${home.agent.name} แล้ว ${home.agent.responseTime}` };
}
