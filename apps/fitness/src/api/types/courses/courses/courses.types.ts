import type { EnrollmentStatus } from '@/api/services/courses/courses/courses.service';
import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';

export type CourseDto = {
  id: string;
  title: string;
  description: string | null;
  trainerId: string | null;
  trainerName: string | null;
  room: string | null;
  schedule: string;
  startsOn: string;
  endsOn: string;
  sessions: number;
  capacity: number;
  priceSatang: number;
  active: boolean;
  /** ที่นั่งที่ถูกจอง (รอชำระ + รอตรวจ + ชำระแล้ว) */
  taken: number;
  paid: number;
  /** รอเจ้าหน้าที่ตรวจสลิป */
  review: number;
  /** มีการสมัครเคยเกิดขึ้น (รวมที่ยกเลิก) — มีแล้วลบคอร์สไม่ได้ */
  hasEnrollments: boolean;
  updatedAt: string;
  updatedByName: string | null;
};

export type EnrollmentDto = {
  id: string;
  receiptNo: string;
  courseId: string;
  courseTitle: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  memberPhone: string;
  status: EnrollmentStatus;
  method: PaymentMethod;
  amountSatang: number;
  listPriceSatang: number;
  discountSatang: number;
  couponCode: string | null;
  createdAt: string;
  paidAt: string | null;
  receivedBy: string | null;
  hasSlip: boolean;
};

/** คอร์สในพอร์ทัลสมาชิก พร้อมสถานะการสมัครของตัวเอง */
export type PortalCourseDto = Omit<CourseDto, 'paid' | 'review' | 'hasEnrollments' | 'updatedAt' | 'updatedByName'> & {
  mine: { id: string; status: EnrollmentStatus } | null;
};
