import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Role } from '@/features/auth/roles';

/*
 * บัญชีหลังบ้าน (mock) — ระยะที่ 2 ย้ายไป Better Auth + 2FA (§10.1)
 * บัญชีทดลอง (รหัสผ่าน = DEMO_PASSWORD ใน .env.example):
 *   agent   kritsada@baanhub.test   (ดูแล BH-101, 102, 103, 105)
 *   agent   thana@baanhub.test      (ดูแล BH-104)
 *   admin   admin@baanhub.test      (เห็นทุก agent)
 */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '1234';

export interface Account {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: Role;
  /** ข้อมูลที่ใช้ในสัญญาแต่งตั้งนายหน้า */
  license: string;
  idNumber: string;
  address: string;
  phone: string;
  salt: string;
  hash: string;
  active: boolean;
}

const KEYLEN = 32;
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): { salt: string; hash: string } {
  return { salt, hash: scryptSync(password, salt, KEYLEN).toString('hex') };
}

const OFFICE = '99 ถนนพหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400';
const seed = (a: Omit<Account, 'salt' | 'hash' | 'active'>): Account => ({ ...a, ...hashPassword(DEMO_PASSWORD), active: true });

export const ACCOUNTS: Account[] = [
  seed({ id: 'ag-1', email: 'kritsada@baanhub.test', name: 'นายกฤษดา ใจดี', initials: 'กฤ', role: 'agent', license: 'ทะเบียนนายหน้า นห. 0105-2231', idNumber: '3-1009-01234-56-1', address: OFFICE, phone: '081-111-2233' }),
  seed({ id: 'ag-2', email: 'thana@baanhub.test', name: 'นายธนา โฮมสุข', initials: 'ธน', role: 'agent', license: 'ทะเบียนนายหน้า นห. 0105-3378', idNumber: '3-1009-04567-89-2', address: OFFICE, phone: '082-222-3344' }),
  seed({ id: 'ad-1', email: 'admin@baanhub.test', name: 'นางสาวมาลี เอสเตท', initials: 'มล', role: 'admin', license: 'ทะเบียนนายหน้า นห. 0105-0001', idNumber: '3-1009-07890-12-3', address: OFFICE, phone: '02-000-1234' }),
];

const DUMMY = hashPassword('not-a-real-password');

/** ตรวจรหัสผ่านแบบ constant-time — ตัวระบุที่ไม่มีในระบบก็ใช้เวลาเท่ากัน */
export function verifyCredentials(email: string, password: string): Account | null {
  const account = ACCOUNTS.find(a => a.email === email.trim().toLowerCase() && a.active);
  const { salt, hash } = account ?? DUMMY;
  const ok = timingSafeEqual(scryptSync(password, salt, KEYLEN), Buffer.from(hash, 'hex'));
  return account && ok ? account : null;
}

export function accountById(id: string): Account | undefined {
  return ACCOUNTS.find(a => a.id === id);
}
