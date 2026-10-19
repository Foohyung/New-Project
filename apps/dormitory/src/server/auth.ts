import 'server-only';

export interface Session {
  userId: string;
  name: string;
  nickname: string;
  role: 'owner' | 'manager' | 'staff' | 'tenant';
  building: string;
  /** เฉพาะ role tenant: ห้องที่เช่าอยู่ */
  roomNo?: number;
}

/**
 * ระยะที่ 1: คืน session ตัวอย่างของผู้จัดการหอ
 * ระยะที่ 2: แทนด้วย Better Auth — ทุก entrypoint เรียกฟังก์ชันนี้อยู่แล้ว (§6.1)
 */
export function requireSession(): Promise<Session> {
  return Promise.resolve({ userId: 'staff-01', name: 'มนัสนันท์ ร.', nickname: 'มน', role: 'manager', building: 'บ้านสวนอพาร์ตเมนต์' });
}

/** พนักงานดูได้ทุกห้อง ส่วนผู้เช่าดูได้เฉพาะห้องตัวเอง (A.2) */
export function canReadRoom(session: Session, roomNo: number): boolean {
  if (session.role === 'tenant') return session.roomNo === roomNo;
  return true;
}
