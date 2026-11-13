/** คอร์สเรียน: สถานะการสมัครและการนับที่นั่ง (pure) */

export type EnrollmentStatus = 'pending' | 'review' | 'paid' | 'cancelled';

export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: 'รอชำระ',
  review: 'รอตรวจสลิป',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
};

/** สถานะที่นับเป็นที่นั่ง — รอชำระก็กันที่ไว้ให้ (เจ้าหน้าที่ยกเลิกรายการค้างได้) */
export const SEAT_STATUSES: readonly EnrollmentStatus[] = ['pending', 'review', 'paid'];

export function seatsLeft(capacity: number, taken: number): number {
  return Math.max(0, capacity - taken);
}

/** รับสมัครได้ถ้าเปิดรับ และคอร์สยังไม่จบ */
export function canEnroll(course: { active: boolean; endsOn: string }, today: string): boolean {
  return course.active && course.endsOn >= today;
}
