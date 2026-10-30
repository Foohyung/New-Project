import type { MembershipStatus } from '@/api/services/members/members/members.service';
import type { ClassState } from '@/api/services/classes/classes/classes.service';

export interface ClassDto {
  id: string;
  title: string;
  trainerId: string;
  trainerName: string;
  room: string;
  startsAt: string;
  minutes: number;
  capacity: number;
  booked: number;
  level: 'ง่าย' | 'กลาง' | 'หนัก';
  state: ClassState;
  /** การจองของผู้ใช้ปัจจุบัน (เฉพาะ role สมาชิก) */
  myBookingId: string | null;
}

export interface ClassDetailDto extends ClassDto {
  /** ผู้จองจากสมาชิกนอกชุดข้อมูลตัวอย่าง */
  otherBooked: number;
  roster: { bookingId: string; memberId: string; name: string; code: string; status: MembershipStatus }[];
}
