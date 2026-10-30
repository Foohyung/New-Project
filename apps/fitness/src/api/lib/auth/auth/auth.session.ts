import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Permission, Role } from '@/api/services/auth/auth/auth.roles';
import { isLocked, recordFailure, REMEMBER_DAYS, SESSION_HOURS, type AttemptState } from '@/api/services/auth/auth/auth.service';
import { requireHttps } from '@/api/lib/security/security/security';
import { isUsableToday, toAccount, verifyCredentials, type Account } from '@/api/lib/auth/auth/auth.accounts';
import { prisma } from '@/api/lib/db/db/db';

export type { Role };

export interface Session {
  userId: string;
  name: string;
  nickname: string;
  role: Role;
  roleName?: string;
  permissions?: readonly Permission[];
  branch: string;
  /** ผูกกับเทรนเนอร์ (role = trainer) */
  trainerId?: string;
  /** ผูกกับสมาชิก (role = member) */
  memberId?: string;
  /** ต้องเปลี่ยนรหัสผ่านก่อนใช้งานส่วนอื่น */
  mustChangePassword?: boolean;
}

/** cookie เก็บเฉพาะ token สุ่ม (httpOnly) — ข้อมูลผู้ใช้และบทบาทอยู่ฝั่ง server เท่านั้น */
export const SESSION_COOKIE = 'ff-session';

export const toSession = (a: Account): Session => ({ userId: a.id, name: a.name, nickname: a.nickname, role: a.role, roleName: a.roleName, permissions: a.permissions, branch: a.branch, trainerId: a.trainerId, memberId: a.memberId, mustChangePassword: a.mustChangePassword });

/** ตาราง sessions เก็บ SHA-256 ของ token — ข้อมูลในฐานข้อมูลรั่วก็เอาไปสวมรอยไม่ได้ */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/* ตัวนับการใส่รหัสผิดอยู่ในหน่วยความจำของ process (รีสตาร์ทแล้วเริ่มนับใหม่) */
const holder = globalThis as unknown as { __ffAttempts?: Map<string, AttemptState> };
const attempts = (holder.__ffAttempts ??= new Map<string, AttemptState>());

export type SignInResult = { ok: true; session: Session } | { ok: false; reason: 'invalid' | 'locked' };

/** เข้าสู่ระบบ: ตรวจล็อก → ตรวจรหัสผ่าน → สร้าง session ใหม่ทุกครั้ง (กัน session fixation) */
export async function signIn(identifier: string, password: string, remember: boolean): Promise<SignInResult> {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  if (isLocked(attempts.get(key), now)) return { ok: false, reason: 'locked' };
  const account = await verifyCredentials(identifier, password);
  if (!account) {
    const next = recordFailure(attempts.get(key), now);
    attempts.set(key, next);
    return { ok: false, reason: isLocked(next, now) ? 'locked' : 'invalid' };
  }
  attempts.delete(key);
  const token = randomBytes(32).toString('base64url');
  const maxAge = remember ? REMEMBER_DAYS * 86_400 : SESSION_HOURS * 3_600;
  const db = prisma();
  // ล้าง session ที่หมดอายุแล้วไปด้วย
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  await db.session.create({ data: { tokenHash: hashToken(token), userId: account.id, expiresAt: new Date(now + maxAge * 1000) } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: requireHttps(), path: '/', maxAge });
  return { ok: true, session: toSession(account) };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** session ปัจจุบัน หรือ null ถ้ายังไม่ได้เข้าสู่ระบบ/หมดอายุ — query ครั้งเดียวต่อ request */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const stored = await prisma().session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { roleDefinition: true } } } });
  if (!stored || stored.expiresAt.getTime() <= Date.now() || !isUsableToday(stored.user)) return null;
  return toSession(toAccount(stored.user));
});

/** ทุก entrypoint (หน้า, Server Action, Route Handler) เรียกฟังก์ชันนี้ก่อนเสมอ (§6.1) — ไม่มี session ส่งไปหน้าเข้าสู่ระบบ */
export async function requireSession(): Promise<Session> {
  const session = await requireSignedIn();
  // บัญชีที่ต้องเปลี่ยนรหัสผ่าน (รหัสเริ่มต้น) ใช้หน้าอื่น/action อื่นไม่ได้จนกว่าจะเปลี่ยน
  if (session.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);
  return session;
}

/** บังคับเปลี่ยนรหัสผ่าน = ขั้นที่ 2 ของหน้าเข้าสู่ระบบ */
export const CHANGE_PASSWORD_PATH = '/login';

/** เหมือน requireSession แต่ไม่บังคับเปลี่ยนรหัสผ่าน — ใช้กับหน้า/action เปลี่ยนรหัสผ่านเท่านั้น */
export async function requireSignedIn(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
