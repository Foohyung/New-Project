import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { permissionsForRole, permissionsFromUnknown, type Permission, type Role } from '@/api/services/auth/auth/auth.roles';
import { accountUsable, normalizeIdentifier } from '@/api/services/auth/auth/auth.service';
import type { Prisma, User } from '@/api/lib/db/db/generated/prisma/client';
import { dayOrNull, prisma } from '@/api/lib/db/db/db';
import { today } from '@/api/lib/clock/clock/clock';

/*
 * บัญชีผู้ใช้ — อยู่ในตาราง users บทบาทผูกกับบัญชี ผู้ใช้เลือกบทบาทเองไม่ได้
 * สร้างบัญชีเจ้าของคนแรกด้วย `pnpm db:seed` (prisma/seed.mjs) · รหัสผ่านเก็บเป็น scrypt 'salt:hash'
 */

export interface Account {
  id: string;
  login: string;
  name: string;
  nickname: string;
  role: Role;
  roleName: string;
  permissions: Permission[];
  branch: string;
  trainerId?: string;
  memberId?: string;
  /** ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน */
  mustChangePassword?: boolean;
}

/** ความยาว hash ของ scrypt — ต้องตรงกับ prisma/seed.mjs และ prisma/sample-data.mjs */
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, KEYLEN).toString('hex')}`;
}

type UserWithRole = User & { roleDefinition: { name: string; permissions: Prisma.JsonValue } };

export function toAccount(u: UserWithRole): Account {
  return {
    id: u.id,
    login: u.login,
    name: u.name,
    nickname: u.nickname,
    role: u.role,
    roleName: u.roleDefinition.name,
    permissions: permissionsForRole(u.role, permissionsFromUnknown(u.roleDefinition.permissions)),
    branch: u.branch,
    ...(u.trainerId ? { trainerId: u.trainerId } : {}),
    ...(u.memberId ? { memberId: u.memberId } : {}),
    ...(u.mustChangePassword ? { mustChangePassword: true } : {}),
  };
}

/** hash หลอกสำหรับตัวระบุที่ไม่มีในระบบ — ใช้เวลาเท่ากัน ไม่ให้เดาได้ว่าบัญชีมีอยู่จริง */
const DUMMY = `00000000000000000000000000000000:${'0'.repeat(KEYLEN * 2)}`;

function passwordMatches(password: string, stored: string): boolean {
  const [salt = '', hash = ''] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== KEYLEN) return false;
  return timingSafeEqual(scryptSync(password, salt, KEYLEN), expected);
}

/** ตรวจรหัสผ่านแบบ constant-time — คืนบัญชีเมื่อถูกต้องเท่านั้น */
export async function verifyCredentials(identifier: string, password: string): Promise<Account | null> {
  const user = await prisma().user.findUnique({ where: { login: normalizeIdentifier(identifier) }, include: { roleDefinition: true } });
  const usable = user ? isUsableToday(user) : false;
  const ok = passwordMatches(password, user && usable ? user.passwordHash : DUMMY);
  return user && usable && ok ? toAccount(user) : null;
}

/** เปิดใช้งาน และวันนี้อยู่ในช่วง active from–to ของบัญชี — ใช้ทั้งตอนเข้าสู่ระบบและตรวจ session ทุก request */
export function isUsableToday(user: Pick<User, 'active' | 'activeFrom' | 'activeTo'>): boolean {
  return accountUsable({ active: user.active, activeFrom: dayOrNull(user.activeFrom), activeTo: dayOrNull(user.activeTo) }, today());
}

/** ความยาวขั้นต่ำของรหัสผ่านที่ผู้ใช้ตั้งเอง (หน้าเปลี่ยนรหัสผ่าน) */
export const MIN_OWN_PASSWORD = 8;

/**
 * เปลี่ยนรหัสผ่านของตัวเอง — ต้องไม่ซ้ำรหัสเดิม · ล้างธงบังคับเปลี่ยนรหัส · ลบ session ทั้งหมด (keepTokenHash = เก็บ session นั้นไว้)
 */
export async function changeOwnPassword(userId: string, newPassword: string, keepTokenHash: string | null): Promise<void> {
  if (newPassword.length < MIN_OWN_PASSWORD) throw new Error('PASSWORD_TOO_SHORT');
  const db = prisma();
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new Error('NOT_FOUND');
  if (passwordMatches(newPassword, user.passwordHash)) throw new Error('PASSWORD_UNCHANGED');
  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword), mustChangePassword: false, updatedById: userId } });
  await db.session.deleteMany({ where: { userId, ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}) } });
}
