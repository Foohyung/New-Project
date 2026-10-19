import type { z } from 'zod';
import { COUPON_REJECT } from '../coupons/service';

/** ผลลัพธ์ของ Server Action ที่หน้าเว็บแสดงต่อได้ (§6.1) */
export type ActionResult =
  | { ok: true; message: string; href?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }
  | null;

export function validationFailure(error: z.ZodError, message = 'กรุณาตรวจข้อมูลที่ไฮไลต์'): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
  return { ok: false, message, fieldErrors };
}

/** แปลง error ที่รู้จักจาก DAL เป็นข้อความที่บอกวิธีแก้ (§15.1) — error อื่นโยนต่อให้ error boundary */
export function knownFailure(error: unknown): ActionResult {
  const code = error instanceof Error ? error.message : '';
  if (code === 'FORBIDDEN') return { ok: false, message: 'บทบาทของคุณทำรายการนี้ไม่ได้ ติดต่อผู้จัดการสาขา' };
  if (code === 'NOT_FOUND') return { ok: false, message: 'ไม่พบข้อมูลนี้แล้ว ลองรีเฟรชหน้า' };
  if (code === 'PHONE_TAKEN') return { ok: false, message: 'เบอร์นี้มีสมาชิกใช้อยู่แล้ว ค้นหาจากหน้าสมาชิกแทนการสมัครใหม่', fieldErrors: { phone: 'เบอร์นี้ถูกใช้แล้ว' } };
  if (code.startsWith('COUPON:')) {
    const reason = code.slice('COUPON:'.length) as keyof typeof COUPON_REJECT;
    return { ok: false, message: COUPON_REJECT[reason], fieldErrors: { couponCode: COUPON_REJECT[reason] } };
  }
  if (code === 'NO_CONSENT') return { ok: false, message: 'สมาชิกไม่ได้ยินยอมรับข่าวสาร ส่งข้อความการตลาดไม่ได้ (PDPA) — โทรหาแทน' };
  if (code === 'COUPON_TAKEN') return { ok: false, message: 'มีโค้ดนี้อยู่แล้ว ตั้งชื่อโค้ดใหม่', fieldErrors: { code: 'โค้ดซ้ำ' } };
  throw error;
}

/** อ่าน FormData เป็น object ของ string (ไม่รวมไฟล์) */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) if (typeof value === 'string') out[key] = value;
  return out;
}
