import { describe, expect, it } from 'vitest';
import { classState, decideBooking, decideCancel } from './service';

const now = new Date('2026-10-15T11:42:00Z'); // 18:42 เวลาไทย
const base = { startsAt: '2026-10-15T13:00:00Z', capacity: 20, booked: 10, alreadyBooked: false, memberStatus: 'active' as const, now };

describe('decideBooking (A.1 ความจุคลาส)', () => {
  it('จองได้เมื่อยังมีที่ว่างและสมาชิกใช้งานอยู่', () => {
    expect(decideBooking(base)).toEqual({ ok: true });
    expect(decideBooking({ ...base, memberStatus: 'expiring' })).toEqual({ ok: true });
  });
  it('กันจองเกินความจุ (ที่นั่งสุดท้ายยังจองได้)', () => {
    expect(decideBooking({ ...base, booked: 19 })).toEqual({ ok: true });
    expect(decideBooking({ ...base, booked: 20 })).toEqual({ ok: false, reason: 'full' });
  });
  it('กันจองซ้ำ จองคลาสที่เริ่มแล้ว และสมาชิกที่หมดอายุ/พักสมาชิก', () => {
    expect(decideBooking({ ...base, alreadyBooked: true })).toEqual({ ok: false, reason: 'duplicate' });
    expect(decideBooking({ ...base, startsAt: '2026-10-15T11:00:00Z' })).toEqual({ ok: false, reason: 'started' });
    expect(decideBooking({ ...base, memberStatus: 'expired' })).toEqual({ ok: false, reason: 'inactive' });
    expect(decideBooking({ ...base, memberStatus: 'frozen' })).toEqual({ ok: false, reason: 'inactive' });
  });
});

describe('decideCancel (ยกเลิกก่อนเวลาที่กำหนด)', () => {
  it('ยกเลิกได้เมื่อเหลือเวลาอย่างน้อย 2 ชั่วโมง', () => {
    expect(decideCancel('2026-10-15T13:42:00Z', now)).toEqual({ ok: true });
    expect(decideCancel('2026-10-15T13:41:00Z', now)).toEqual({ ok: false, reason: 'too-late' });
  });
});

describe('classState', () => {
  it('แยกคลาสที่ยังไม่เริ่ม กำลังเรียน และจบแล้ว', () => {
    expect(classState('2026-10-15T11:00:00Z', 45, now)).toBe('live');
    expect(classState('2026-10-15T10:00:00Z', 45, now)).toBe('ended');
    expect(classState('2026-10-15T12:00:00Z', 45, now)).toBe('upcoming');
  });
});
