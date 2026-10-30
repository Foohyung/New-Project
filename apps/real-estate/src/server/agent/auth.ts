import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPermission, type Permission, type Role } from '@/features/auth/roles';
import { isLocked, LOGIN_PATH, recordFailure, SESSION_HOURS, type AttemptState } from '@/features/auth/service';
import { ACCOUNTS, verifyCredentials, type Account } from './accounts';

export interface Session {
  userId: string;
  name: string;
  initials: string;
  role: Role;
}

/** cookie เก็บเฉพาะ token สุ่ม (httpOnly) — บทบาทอยู่ฝั่ง server เท่านั้น */
export const SESSION_COOKIE = 'bh-agent-session';

const toSession = (a: Account): Session => ({ userId: a.id, name: a.name, initials: a.initials, role: a.role });

/** session ตัวอย่างสำหรับ unit test ของ DAL */
export const DEMO_SESSIONS = Object.fromEntries(ACCOUNTS.map(a => [a.id, toSession(a)])) as Record<string, Session>;

interface StoredSession { accountId: string; expiresAt: number }
const holder = globalThis as unknown as { __bhSessions?: Map<string, StoredSession>; __bhAttempts?: Map<string, AttemptState> };
const sessions = (holder.__bhSessions ??= new Map<string, StoredSession>());
const attempts = (holder.__bhAttempts ??= new Map<string, AttemptState>());

export type SignInResult = { ok: true; session: Session } | { ok: false; reason: 'invalid' | 'locked' };

/** ตรวจล็อก → ตรวจรหัสผ่าน → สร้าง session ใหม่ทุกครั้ง (กัน session fixation) */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  if (isLocked(attempts.get(key), now)) return { ok: false, reason: 'locked' };
  const account = verifyCredentials(email, password);
  if (!account) {
    const next = recordFailure(attempts.get(key), now);
    attempts.set(key, next);
    return { ok: false, reason: isLocked(next, now) ? 'locked' : 'invalid' };
  }
  attempts.delete(key);
  const token = randomBytes(32).toString('base64url');
  const maxAge = SESSION_HOURS * 3_600;
  sessions.set(token, { accountId: account.id, expiresAt: now + maxAge * 1000 });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/agent', maxAge });
  return { ok: true, session: toSession(account) };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  jar.delete({ name: SESSION_COOKIE, path: '/agent' });
}

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

/** ทุก entrypoint ของหลังบ้านเรียกก่อนเสมอ (§6.1) */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}

export class ForbiddenError extends Error {
  constructor() {
    super('FORBIDDEN');
  }
}

export function can(session: Session, permission: Permission): boolean {
  return hasPermission(session.role, permission);
}

/** ตรวจสิทธิ์ใน DAL ทุกฟังก์ชัน (§10.2) */
export function authorize(session: Session, permission: Permission): void {
  if (!can(session, permission)) throw new ForbiddenError();
}
