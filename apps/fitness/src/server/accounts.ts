import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Role } from '@/features/auth/roles';
import { normalizeIdentifier } from '@/features/auth/service';

/*
 * บัญชีผู้ใช้ (mock) — บทบาทผูกกับบัญชีในระบบหลังบ้าน ผู้ใช้เลือกบทบาทเองไม่ได้
 * ระยะที่ 2: ย้ายไปตาราง users ของ Better Auth (+2FA สำหรับพนักงาน §10.1)
 *
 * บัญชีทดลอง (ใช้รหัสผ่านเดียวกัน = DEMO_PASSWORD ใน .env.example):
 *   เจ้าของ       owner@fitflow.test
 *   ผู้จัดการ      manager@fitflow.test
 *   เคาน์เตอร์     desk@fitflow.test
 *   เทรนเนอร์     boss@fitflow.test
 *   สมาชิก        เบอร์ 080-000-0101
 */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'FitFlow!2569';

export interface Account {
  id: string;
  /** อีเมล (พนักงาน) หรือเบอร์มือถือ (สมาชิก) — เก็บแบบ normalize แล้ว */
  login: string;
  name: string;
  nickname: string;
  role: Role;
  branch: string;
  trainerId?: string;
  memberId?: string;
  salt: string;
  hash: string;
  active: boolean;
}

const BRANCH = 'สาขาอารีย์';
const KEYLEN = 32;

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): { salt: string; hash: string } {
  return { salt, hash: scryptSync(password, salt, KEYLEN).toString('hex') };
}

const seed = (a: Omit<Account, 'salt' | 'hash' | 'active'>): Account => ({ ...a, login: normalizeIdentifier(a.login), ...hashPassword(DEMO_PASSWORD), active: true });

export const ACCOUNTS: Account[] = [
  seed({ id: 'staff-00', login: 'owner@fitflow.test', name: 'กิตติพงษ์ ส.', nickname: 'กต', role: 'owner', branch: BRANCH }),
  seed({ id: 'staff-01', login: 'manager@fitflow.test', name: 'มนัสนันท์ ร.', nickname: 'มน', role: 'manager', branch: BRANCH }),
  seed({ id: 'staff-02', login: 'desk@fitflow.test', name: 'ปริญญา ท.', nickname: 'ปริ', role: 'front-desk', branch: BRANCH }),
  seed({ id: 'staff-03', login: 'boss@fitflow.test', name: 'ณัฐวุฒิ บ.', nickname: 'บอส', role: 'trainer', branch: BRANCH, trainerId: 't1' }),
  seed({ id: 'member-01', login: '0800000101', name: 'ณัฐพล ศรีสุข', nickname: 'ณัฐพล', role: 'member', branch: BRANCH, memberId: '01' }),
];

/** hash หลอกสำหรับตัวระบุที่ไม่มีในระบบ — ใช้เวลาเท่ากัน ไม่ให้เดาได้ว่าบัญชีมีอยู่จริง */
const DUMMY = hashPassword('not-a-real-password');

/** ตรวจรหัสผ่านแบบ constant-time — คืนบัญชีเมื่อถูกต้องเท่านั้น */
export function verifyCredentials(identifier: string, password: string): Account | null {
  const account = ACCOUNTS.find(a => a.login === normalizeIdentifier(identifier) && a.active);
  const { salt, hash } = account ?? DUMMY;
  const candidate = scryptSync(password, salt, KEYLEN);
  const ok = timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
  return account && ok ? account : null;
}
