import type { z } from 'zod';
import { COUPON_REJECT } from '@/api/services/coupons/coupons/coupons.service';

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
  if (code === 'PAYMENT_METHOD_DISABLED') return { ok: false, message: 'วิธีชำระนี้ถูกปิดใช้งานในสาขาแล้ว กรุณาเลือกวิธีอื่น' };
  if (code === 'SLIP_REQUIRED') return { ok: false, message: 'กรุณาแนบรูปสลิปก่อนแจ้งชำระ', fieldErrors: { slipFile: 'กรุณาเลือกรูปสลิป' } };
  if (code === 'NOT_FOUND') return { ok: false, message: 'ไม่พบข้อมูลนี้แล้ว ลองรีเฟรชหน้า' };
  if (code === 'CLASS_IN_USE') return { ok: false, message: 'ยังลบคลาสนี้ไม่ได้ เพราะมีการจองหรือประวัติการจอง/ผู้จองนอกระบบ — เก็บคลาสไว้เพื่อรักษาประวัติ' };
  if (code === 'PHONE_TAKEN') return { ok: false, message: 'เบอร์นี้มีสมาชิกใช้อยู่แล้ว ค้นหาจากหน้าสมาชิกแทนการสมัครใหม่', fieldErrors: { phone: 'เบอร์นี้ถูกใช้แล้ว' } };
  if (code.startsWith('COUPON:')) {
    const reason = code.slice('COUPON:'.length) as keyof typeof COUPON_REJECT;
    return { ok: false, message: COUPON_REJECT[reason], fieldErrors: { couponCode: COUPON_REJECT[reason] } };
  }
  if (code === 'NO_CONSENT') return { ok: false, message: 'สมาชิกไม่ได้ยินยอมรับข่าวสาร ส่งข้อความการตลาดไม่ได้ (PDPA) — โทรหาแทน' };
  if (code === 'NO_HEALTH_CONSENT') return { ok: false, message: 'ยังไม่ได้ยินยอมให้เก็บข้อมูลสุขภาพ กรอกข้อมูลร่างกายก่อนบันทึกอาหาร' };
  if (code === 'COUPON_TAKEN') return { ok: false, message: 'มีโค้ดนี้อยู่แล้ว ตั้งชื่อโค้ดใหม่', fieldErrors: { code: 'โค้ดซ้ำ' } };
  if (code === 'COUPON_NOT_EDITABLE') return { ok: false, message: 'คูปองระบบนี้แก้ไขจากหน้านี้ไม่ได้' };
  if (code === 'COUPON_LIMIT_BELOW_USED') return { ok: false, message: 'จำนวนสิทธิ์ใหม่ต้องไม่น้อยกว่าจำนวนที่ใช้ไปแล้ว', fieldErrors: { limit: 'น้อยกว่าจำนวนที่ใช้ไปแล้ว' } };
  if (code === 'USER_LOGIN_TAKEN') return { ok: false, message: 'อีเมล เบอร์มือถือ หรือรหัสผู้ใช้นี้มีบัญชีแล้ว', fieldErrors: { login: 'ข้อมูลเข้าสู่ระบบนี้ถูกใช้แล้ว' } };
  if (code === 'OWNER_BRANCH_TAKEN') return { ok: false, message: 'เจ้าของคนนี้ดูแลสาขานี้อยู่แล้ว', fieldErrors: { branch: 'สาขาซ้ำ' } };
  if (code === 'USER_SELF_LOCKOUT') return { ok: false, message: 'แก้บทบาท ปิดใช้งาน ตั้งช่วงวันที่ หรือลบบัญชีของตัวเองไม่ได้ (กันล็อกตัวเองออกจากระบบ)' };
  if (code === 'MEMBER_LOGIN_TAKEN') return { ok: false, message: 'เบอร์นี้ถูกใช้เป็นชื่อเข้าสู่ระบบของบัญชีอื่นแล้ว ใช้เบอร์อื่น', fieldErrors: { phone: 'เบอร์นี้มีบัญชีเข้าสู่ระบบแล้ว' } };
  if (code.startsWith('RECEIPT_FORMAT_TAKEN:')) return { ok: false, message: `สาขา ${code.slice('RECEIPT_FORMAT_TAKEN:'.length)} ใช้รูปแบบเลขที่ใบเสร็จนี้อยู่แล้ว — ใส่ตัวย่อของสาขานี้ให้ต่างกัน เช่น BKK-{YY}{MM}-{####}`, fieldErrors: { numberFormat: 'รูปแบบซ้ำกับสาขาอื่น' } };
  if (code === 'BRANCH_TAKEN') return { ok: false, message: 'มีสาขาชื่อนี้อยู่แล้ว ตั้งชื่อใหม่', fieldErrors: { name: 'ชื่อสาขาซ้ำ' } };
  if (code === 'UNKNOWN_BRANCH') return { ok: false, message: 'ไม่พบสาขานี้ เลือกจากรายการ หรือให้ admin เพิ่มสาขาที่เมนูตั้งค่า > สาขา ก่อน', fieldErrors: { branch: 'เลือกสาขาจากรายการ' } };
  if (code === 'BRANCH_IN_USE') return { ok: false, message: 'ยังลบสาขานี้ไม่ได้ เพราะมีบัญชีผู้ใช้หรือสินค้าอยู่ในสาขา — ย้ายบัญชีไปสาขาอื่นก่อน หรือปิดใช้งานสาขาแทน' };
  if (code === 'PACKAGE_IN_USE') return { ok: false, message: 'ยังลบแพ็กเกจนี้ไม่ได้ เพราะมีสมาชิกหรือประวัติการชำระอ้างอยู่ — ปิดขายแทน (เอาติ๊ก "เปิดขาย" ออก)' };
  if (code.startsWith('COURSE_CAPACITY:')) return { ok: false, message: `มีผู้สมัครแล้ว ${code.slice('COURSE_CAPACITY:'.length)} คน ลดที่นั่งต่ำกว่านี้ไม่ได้`, fieldErrors: { capacity: `อย่างน้อย ${code.slice('COURSE_CAPACITY:'.length)} ที่` } };
  if (code === 'COURSE_IN_USE') return { ok: false, message: 'ยังลบคอร์สนี้ไม่ได้ เพราะมีประวัติการสมัคร — ปิดรับสมัครแทน (เอาติ๊ก "เปิดรับสมัคร" ออก)' };
  if (code === 'COURSE_FULL') return { ok: false, message: 'คอร์สนี้เต็มแล้ว ลองเลือกคอร์สอื่น หรือสอบถามเคาน์เตอร์' };
  if (code === 'COURSE_CLOSED') return { ok: false, message: 'คอร์สนี้ปิดรับสมัครแล้ว' };
  if (code === 'ENROLLMENT_CANCELLED') return { ok: false, message: 'รายการนี้ถูกยกเลิกแล้ว ให้สมาชิกสมัครใหม่' };
  if (code === 'PRODUCT_TAKEN') return { ok: false, message: 'มีสินค้าชื่อนี้อยู่แล้ว ตั้งชื่อใหม่', fieldErrors: { name: 'ชื่อสินค้าซ้ำ' } };
  if (code === 'PRODUCT_IN_USE') return { ok: false, message: 'ยังลบสินค้านี้ไม่ได้ เพราะเคยขายไปแล้ว — ปิดขายแทน (เอาติ๊ก "เปิดขาย" ออก)' };
  if (code === 'SALE_PRODUCT_BRANCH_MISMATCH') return { ok: false, message: 'ยกเลิกบิลนี้ไม่ได้ เพราะสินค้าในบิลไม่ได้อยู่ในสาขาเดียวกันกับบิล' };
  if (code.startsWith('OUT_OF_STOCK:')) return { ok: false, message: `${code.slice('OUT_OF_STOCK:'.length)} มีไม่พอขาย ลดจำนวนหรือรับของเข้าก่อน` };
  if (code === 'PRODUCT_INACTIVE') return { ok: false, message: 'มีสินค้าที่ปิดขายแล้วอยู่ในตะกร้า รีเฟรชหน้าแล้วเลือกใหม่' };
  if (code === 'NEGATIVE_STOCK') return { ok: false, message: 'ปรับแล้วสต็อกติดลบไม่ได้', fieldErrors: { qty: 'จำนวนมากกว่าที่มีอยู่' } };
  if (code === 'SALE_VOIDED') return { ok: false, message: 'บิลนี้ถูกยกเลิกไปแล้ว' };
  if (code === 'TRAINER_IN_USE') return { ok: false, message: 'ยังลบเทรนเนอร์คนนี้ไม่ได้ เพราะมีคิว PT หรือประวัติคิว PT ที่ผูกอยู่' };
  if (code === 'TRAINER_REASSIGN_REQUIRED') return { ok: false, message: 'เลือกเทรนเนอร์คนใหม่สำหรับย้ายตารางคลาสก่อนลบ' };
  if (code === 'TRAINER_REASSIGN_INVALID') return { ok: false, message: 'ไม่พบเทรนเนอร์คนใหม่ที่เลือก รีเฟรชหน้าแล้วลองอีกครั้ง' };
  if (code === 'ROLE_TAKEN') return { ok: false, message: 'รหัส role นี้ถูกใช้แล้ว', fieldErrors: { id: 'ตั้งรหัส role ใหม่' } };
  if (code === 'ROLE_IN_USE') return { ok: false, message: 'ยังลบ role นี้ไม่ได้ เพราะมีบัญชีผู้ใช้ผูกอยู่' };
  if (code === 'ROLE_PROTECTED') return { ok: false, message: 'role ระบบนี้ได้รับการป้องกันและลบไม่ได้' };
  if (code === 'ADMIN_ROLE_PROTECTED') return { ok: false, message: 'role admin ถูกป้องกัน ไม่สามารถแก้ไขหรือลบได้' };
  if (code === 'INVALID_ROLE_PERMISSIONS') return { ok: false, message: 'สิทธิ์ที่เลือกไม่ถูกต้อง หรือมีสิทธิ์เฉพาะสมาชิกที่ custom role ใช้ไม่ได้' };
  if (code === 'INVALID_USER_ROLE') return { ok: false, message: 'role ที่เลือกไม่มีอยู่ หรือการเชื่อมบัญชีสมาชิก/เทรนเนอร์ไม่ถูกต้อง', fieldErrors: { role: 'เลือก role ใหม่' } };
  throw error;
}

/** อ่าน FormData เป็น object ของ string (ไม่รวมไฟล์) */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) if (typeof value === 'string') out[key] = value;
  return out;
}
