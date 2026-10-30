/* ตัวช่วยของ integration test ใน DAL — รันกับ MySQL จริงที่ตั้งใน TEST_DATABASE_URL (ฐานข้อมูลสำหรับทดสอบเท่านั้น ข้อมูลถูกลบทุก test) */
import mariadb from 'mariadb';
import { describe } from 'vitest';
import type { BuiltInRole } from '@/api/services/auth/auth/auth.roles';
import { loadSampleData, wipe } from '../../../../../prisma/sample-data.mjs';
import { connectionConfig } from '../../../../../prisma/seed.mjs';
import type { Session } from '@/api/lib/auth/auth/auth.session';

/** ไม่มี TEST_DATABASE_URL = ข้าม test ที่ต้องใช้ฐานข้อมูล */
export const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** ล้างฐานข้อมูลทดสอบแล้วใส่ข้อมูลตัวอย่างใหม่ (prisma/sample-data.mjs) */
export async function resetDatabase(): Promise<void> {
  const conn = await mariadb.createConnection(connectionConfig(process.env.TEST_DATABASE_URL));
  try {
    await wipe(conn);
    await loadSampleData(conn);
  } finally {
    await conn.end();
  }
}

const BRANCH = 'สาขาอารีย์';
/** session ของบัญชีตัวอย่างแต่ละบทบาท (ตรงกับ users ใน prisma/sample-data.mjs) */
export const USERS: Record<BuiltInRole, Session> = {
  admin: { userId: 'staff-admin', name: 'ผู้ดูแลระบบ', nickname: 'แอดมิน', role: 'admin', branch: BRANCH },
  owner: { userId: 'staff-00', name: 'กิตติพงษ์ ส.', nickname: 'กต', role: 'owner', branch: BRANCH },
  manager: { userId: 'staff-01', name: 'มนัสนันท์ ร.', nickname: 'มน', role: 'manager', branch: BRANCH },
  'front-desk': { userId: 'staff-02', name: 'ปริญญา ท.', nickname: 'ปริ', role: 'front-desk', branch: BRANCH },
  trainer: { userId: 'staff-03', name: 'ณัฐวุฒิ บ.', nickname: 'บอส', role: 'trainer', branch: BRANCH, trainerId: 't1' },
  member: { userId: 'member-01', name: 'ณัฐพล ศรีสุข', nickname: 'ณัฐพล', role: 'member', branch: BRANCH, memberId: '01' },
};
