import type { PaymentDto } from '../payments/types';
import type { MembershipStatus } from './service';

/** DTO ที่ส่งให้หน้าเว็บ — ไม่ส่ง record ทั้งก้อน (§6.2) */
export interface MemberDto {
  id: string;
  code: string;
  name: string;
  phone: string;
  packageId: string;
  packageName: string;
  expiresOn: string;
  daysLeft: number;
  status: MembershipStatus;
  lastCheckInAt: string | null;
  ptSessionsLeft: number;
  joinedOn: string;
}

export interface MemberDetailDto extends MemberDto {
  email: string | null;
  note: string | null;
  freeze: { from: string; until: string } | null;
  checkIns: { at: string; allowed: boolean }[];
  bookings: { id: string; classId: string; title: string; startsAt: string; room: string }[];
  ptSessions: { id: string; trainerName: string; startsAt: string; status: 'booked' | 'done' | 'cancelled' }[];
  /** null เมื่อผู้ใช้ไม่มีสิทธิ์ดูการเงิน */
  payments: PaymentDto[] | null;
  pendingPaymentId: string | null;
}
