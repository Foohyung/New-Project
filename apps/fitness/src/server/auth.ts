import 'server-only';
import { cookies } from 'next/headers';
import { isRole, type Role } from '@/features/auth/roles';

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

/** cookie สำหรับสลับบทบาทในโหมดเดโมเท่านั้น — ระยะที่ 2 ลบทิ้งเมื่อใช้ Better Auth */
export const DEMO_ROLE_COOKIE = 'ff-demo-role';

const BRANCH = 'สาขาอารีย์';

export const DEMO_USERS: Record<Role, Session> = {
  owner: { userId: 'staff-00', name: 'กิตติพงษ์ ส.', nickname: 'กต', role: 'owner', branch: BRANCH },
  manager: { userId: 'staff-01', name: 'มนัสนันท์ ร.', nickname: 'มน', role: 'manager', branch: BRANCH },
  'front-desk': { userId: 'staff-02', name: 'ปริญญา ท.', nickname: 'ปริ', role: 'front-desk', branch: BRANCH },
  trainer: { userId: 'staff-03', name: 'ณัฐวุฒิ บ.', nickname: 'บอส', role: 'trainer', branch: BRANCH, trainerId: 't1' },
  member: { userId: 'member-01', name: 'ณัฐพล ศรีสุข', nickname: 'ณัฐพล', role: 'member', branch: BRANCH, memberId: '01' },
};

/**
 * ระยะที่ 1 (mock): อ่านบทบาทจาก cookie โหมดเดโม ค่าเริ่มต้นคือผู้จัดการสาขา
 * ระยะที่ 2: แทนด้วย Better Auth (+2FA สำหรับพนักงาน §10.1) — ทุก entrypoint เรียกฟังก์ชันนี้อยู่แล้ว (§6.1)
 */
export async function requireSession(): Promise<Session> {
  const role = (await cookies()).get(DEMO_ROLE_COOKIE)?.value;
  return DEMO_USERS[isRole(role) ? role : 'manager'];
}
