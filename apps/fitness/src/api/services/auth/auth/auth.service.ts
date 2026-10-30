/** กติกาการเข้าสู่ระบบ (pure — ทดสอบได้โดยไม่ต้องมี server) */
import { normalizePhone } from '@/api/lib/utils/utils/utils';
import type { Role } from '@/api/services/auth/auth/auth.roles';

/** ใส่ผิดครบกี่ครั้งแล้วล็อก และล็อกนานเท่าไร (กันเดารหัสผ่าน §10.1) */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/** อายุ session: ปกติ 12 ชั่วโมง · ติ๊ก "จดจำฉัน" 30 วัน */
export const SESSION_HOURS = 12;
export const REMEMBER_DAYS = 30;

/**
 * บัญชีใช้งานได้วันนี้ไหม: เปิดใช้งาน และอยู่ในช่วง activeFrom–activeTo (รวมทั้งสองวัน · null = ไม่จำกัด)
 * วันที่ทั้งหมดเป็น 'YYYY-MM-DD' ตามเวลาไทย จึงเทียบเป็นข้อความได้
 */
export function accountUsable(user: { active: boolean; activeFrom: string | null; activeTo: string | null }, today: string): boolean {
  if (!user.active) return false;
  if (user.activeFrom && today < user.activeFrom) return false;
  return !(user.activeTo && today > user.activeTo);
}

/** อีเมลเป็นตัวพิมพ์เล็ก · เบอร์มือถือเหลือแต่ตัวเลข — ให้พิมพ์แบบไหนก็หาเจอ */
export function normalizeIdentifier(input: string): string {
  const value = input.trim();
  if (value.includes('@')) return value.toLowerCase();
  const digits = normalizePhone(value);
  return digits.length >= 9 ? digits : value.toLowerCase();
}

/** หน้าแรกของแต่ละบทบาท (บทบาทมาจากบัญชีในระบบหลังบ้าน ผู้ใช้เลือกเองไม่ได้) */
export function landingFor(role: Role): string {
  if (role === 'member') return '/me';
  if (role === 'trainer') return '/classes';
  return '/';
}

/** รับเฉพาะ path ภายในเว็บ กัน open redirect (เช่น //evil.com หรือ https://...) */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (next.startsWith('/login')) return null;
  return next.slice(0, 200);
}

export interface AttemptState {
  failures: number;
  lockedUntil: number | null;
}

export function isLocked(state: AttemptState | undefined, now: number): boolean {
  return Boolean(state?.lockedUntil && state.lockedUntil > now);
}

/** บันทึกการใส่ผิด 1 ครั้ง — ครบกำหนดแล้วล็อก และเริ่มนับใหม่หลังหมดเวลาล็อก */
export function recordFailure(state: AttemptState | undefined, now: number): AttemptState {
  const base = state?.lockedUntil && state.lockedUntil <= now ? { failures: 0, lockedUntil: null } : (state ?? { failures: 0, lockedUntil: null });
  const failures = base.failures + 1;
  return failures >= MAX_FAILED_ATTEMPTS ? { failures, lockedUntil: now + LOCKOUT_MINUTES * 60_000 } : { failures, lockedUntil: null };
}
