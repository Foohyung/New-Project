import type { MembershipStatus } from '../members/service';

/** ยกเลิกการจองได้ก่อนคลาสเริ่มอย่างน้อยกี่นาที (A.1) */
export const CANCEL_CUTOFF_MINUTES = 120;

export type ClassState = 'upcoming' | 'live' | 'ended';

export function classEnd(startsAt: string, minutes: number): Date {
  return new Date(new Date(startsAt).getTime() + minutes * 60_000);
}

export function classState(startsAt: string, minutes: number, now: Date): ClassState {
  if (now < new Date(startsAt)) return 'upcoming';
  return now < classEnd(startsAt, minutes) ? 'live' : 'ended';
}

export type BookingDecision = { ok: true } | { ok: false; reason: 'started' | 'full' | 'duplicate' | 'inactive' };

/** กันจองเกินความจุ จองซ้ำ จองคลาสที่เริ่มแล้ว และสมาชิกที่หมดอายุ/พักสมาชิก */
export function decideBooking(input: { startsAt: string; capacity: number; booked: number; alreadyBooked: boolean; memberStatus: MembershipStatus; now: Date }): BookingDecision {
  if (input.now >= new Date(input.startsAt)) return { ok: false, reason: 'started' };
  if (input.memberStatus === 'expired' || input.memberStatus === 'frozen') return { ok: false, reason: 'inactive' };
  if (input.alreadyBooked) return { ok: false, reason: 'duplicate' };
  if (input.booked >= input.capacity) return { ok: false, reason: 'full' };
  return { ok: true };
}

export const BOOKING_REJECT: Record<Exclude<BookingDecision, { ok: true }>['reason'], string> = {
  started: 'คลาสนี้เริ่มไปแล้ว จองไม่ได้',
  full: 'คลาสเต็มแล้ว ลองเลือกรอบอื่น',
  duplicate: 'สมาชิกคนนี้จองคลาสนี้ไว้แล้ว',
  inactive: 'สมาชิกหมดอายุหรือพักสมาชิกอยู่ ต่ออายุหรือยกเลิกการพักก่อนจอง',
};

export type CancelDecision = { ok: true } | { ok: false; reason: 'too-late' };

export function decideCancel(startsAt: string, now: Date): CancelDecision {
  const minutesBefore = (new Date(startsAt).getTime() - now.getTime()) / 60_000;
  return minutesBefore >= CANCEL_CUTOFF_MINUTES ? { ok: true } : { ok: false, reason: 'too-late' };
}

export const CANCEL_REJECT = `ยกเลิกได้ก่อนคลาสเริ่มอย่างน้อย ${String(CANCEL_CUTOFF_MINUTES / 60)} ชั่วโมง`;
