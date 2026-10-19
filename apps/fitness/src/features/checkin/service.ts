import { daysLeft, membershipStatus, type MembershipLike } from '../members/service';

export type CheckInDecision =
  | { allowed: true; daysLeft: number }
  | { allowed: false; reason: 'not-found' | 'expired' | 'frozen' };

/** ตัดสินว่าสมาชิกเช็กอินได้หรือไม่ (A.1: สมาชิกหมดอายุหรือพักสมาชิกต้องเช็กอินไม่ได้) */
export function decideCheckIn(member: MembershipLike | undefined, today: string): CheckInDecision {
  if (!member) return { allowed: false, reason: 'not-found' };
  const status = membershipStatus(member, today);
  if (status === 'frozen' || status === 'expired') return { allowed: false, reason: status };
  return { allowed: true, daysLeft: daysLeft(member, today) };
}

export const REJECT_MESSAGE: Record<'not-found' | 'expired' | 'frozen', string> = {
  'not-found': 'ไม่พบสมาชิก ตรวจเบอร์โทรหรือรหัสสมาชิกอีกครั้ง',
  expired: 'สมาชิกหมดอายุแล้ว ต่ออายุก่อนเข้าใช้บริการ',
  frozen: 'สมาชิกอยู่ระหว่างพักสมาชิก ยกเลิกการพักก่อนเข้าใช้บริการ',
};
