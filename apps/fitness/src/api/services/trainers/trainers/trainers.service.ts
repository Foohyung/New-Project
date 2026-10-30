/** เวลาที่รับจองเทรนเนอร์ส่วนตัว (เวลาไทย) */
export const PT_OPEN_HOUR = 6;
export const PT_CLOSE_HOUR = 21;
export const PT_MINUTES = 60;

/** ชั่วโมงตามเวลาไทย (ประเทศไทยไม่มี daylight saving จึงบวก 7 ชั่วโมงได้ตรง ๆ) */
export function bangkokHour(instant: string): number {
  return (new Date(instant).getUTCHours() + 7) % 24;
}

export interface SessionLike {
  startsAt: string;
  minutes: number;
  status: 'booked' | 'done' | 'cancelled';
}

function overlaps(a: { startsAt: string; minutes: number }, b: { startsAt: string; minutes: number }): boolean {
  const aStart = new Date(a.startsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  return aStart < bStart + b.minutes * 60_000 && bStart < aStart + a.minutes * 60_000;
}

export type PtDecision = { ok: true } | { ok: false; reason: 'past' | 'outside-hours' | 'overlap' | 'no-sessions' };

/**
 * จองเทรนเนอร์ส่วนตัว (A.1)
 * - ห้ามเวลาซ้อนกับคิวของเทรนเนอร์
 * - สมาชิกต้องมีครั้ง PT เหลือ หลังหักคิวที่จองไว้แล้วแต่ยังไม่ได้เทรน
 */
export function decidePtBooking(input: { startsAt: string; minutes: number; now: Date; trainerSessions: SessionLike[]; sessionsLeft: number; memberUpcoming: number }): PtDecision {
  if (new Date(input.startsAt) <= input.now) return { ok: false, reason: 'past' };
  const startHour = bangkokHour(input.startsAt);
  const endHour = startHour + input.minutes / 60;
  if (startHour < PT_OPEN_HOUR || endHour > PT_CLOSE_HOUR) return { ok: false, reason: 'outside-hours' };
  if (input.trainerSessions.some(s => s.status === 'booked' && overlaps(s, input))) return { ok: false, reason: 'overlap' };
  if (input.sessionsLeft - input.memberUpcoming <= 0) return { ok: false, reason: 'no-sessions' };
  return { ok: true };
}

export const PT_REJECT: Record<Exclude<PtDecision, { ok: true }>['reason'], string> = {
  past: 'เลือกเวลาที่ยังไม่ผ่านมา',
  'outside-hours': `จองได้ระหว่าง ${String(PT_OPEN_HOUR).padStart(2, '0')}:00–${String(PT_CLOSE_HOUR)}:00 น.`,
  overlap: 'เทรนเนอร์มีคิวในเวลานี้แล้ว ลองเลือกเวลาอื่น',
  'no-sessions': 'สมาชิกไม่มีครั้ง PT เหลือ ซื้อแพ็กเกจ PT ก่อนจอง',
};
