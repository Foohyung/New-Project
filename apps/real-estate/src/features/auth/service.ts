/** กติกาการเข้าสู่ระบบหลังบ้าน (pure — ทดสอบได้โดยไม่ต้องมี server) */

/** ใส่ผิดครบกี่ครั้งแล้วล็อก และล็อกนานเท่าไร (กันเดารหัสผ่าน §10.1) */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
export const SESSION_HOURS = 12;

export const LOGIN_PATH = '/agent/login';
export const AGENT_HOME = '/agent';

/** รับเฉพาะ path ของหลังบ้าน กัน open redirect (เช่น //evil.com) */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/agent') || next.startsWith('//') || next.includes('\\')) return null;
  if (next.startsWith(LOGIN_PATH)) return null;
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
