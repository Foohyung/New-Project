import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from '@/features/auth/roles';
import { isLocked, recordFailure, REMEMBER_DAYS, SESSION_HOURS, type AttemptState } from '@/features/auth/service';
import { ACCOUNTS, verifyCredentials, type Account } from './accounts';

export type { Role };

export interface Session {
  userId: string;
  name: string;
  nickname: string;
  role: Role;
  branch: string;
  /** ผูกกับเทรนเนอร์ (role = trainer) */
  trainerId?: string;
  /** ผูกกับสมาชิก (role = member) */
  memberId?: string;
}

/** cookie เก็บเฉพาะ token สุ่ม (httpOnly) — ข้อมูลผู้ใช้และบทบาทอยู่ฝั่ง server เท่านั้น */
export const SESSION_COOKIE = 'ff-session';

const toSession = (a: Account): Session => ({ userId: a.id, name: a.name, nickname: a.nickname, role: a.role, branch: a.branch, trainerId: a.trainerId, memberId: a.memberId });

/** session ของบัญชีตัวอย่าง ใช้ใน unit test ของ DAL */
export const DEMO_USERS = Object.fromEntries(ACCOUNTS.map(a => [a.role, toSession(a)])) as Record<Role, Session>;

/* ---------- ที่เก็บ session และตัวนับการใส่ผิด (ระยะที่ 1 อยู่ในหน่วยความจำ · ระยะที่ 2 ย้ายไปฐานข้อมูล/Redis) ---------- */
interface StoredSession { accountId: string; expiresAt: number }
const holder = globalThis as unknown as { __ffSessions?: Map<string, StoredSession>; __ffAttempts?: Map<string, AttemptState> };
const sessions = (holder.__ffSessions ??= new Map<string, StoredSession>());
const attempts = (holder.__ffAttempts ??= new Map<string, AttemptState>());

export type SignInResult = { ok: true; session: Session } | { ok: false; reason: 'invalid' | 'locked' };

/** เข้าสู่ระบบ: ตรวจล็อก → ตรวจรหัสผ่าน → สร้าง session ใหม่ทุกครั้ง (กัน session fixation) */
export async function signIn(identifier: string, password: string, remember: boolean): Promise<SignInResult> {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  if (isLocked(attempts.get(key), now)) return { ok: false, reason: 'locked' };
  const account = verifyCredentials(identifier, password);
  if (!account) {
    const next = recordFailure(attempts.get(key), now);
    attempts.set(key, next);
    return { ok: false, reason: isLocked(next, now) ? 'locked' : 'invalid' };
  }
  attempts.delete(key);
  const token = randomBytes(32).toString('base64url');
  const maxAge = remember ? REMEMBER_DAYS * 86_400 : SESSION_HOURS * 3_600;
  sessions.set(token, { accountId: account.id, expiresAt: now + maxAge * 1000 });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });
  return { ok: true, session: toSession(account) };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  jar.delete(SESSION_COOKIE);
}

/** session ปัจจุบัน หรือ null ถ้ายังไม่ได้เข้าสู่ระบบ/หมดอายุ */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const stored = token ? sessions.get(token) : undefined;
  if (!token || !stored) return null;
  if (stored.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const account = ACCOUNTS.find(a => a.id === stored.accountId && a.active);
  return account ? toSession(account) : null;
}

/** ทุก entrypoint (หน้า, Server Action, Route Handler) เรียกฟังก์ชันนี้ก่อนเสมอ (§6.1) — ไม่มี session ส่งไปหน้าเข้าสู่ระบบ */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
