import { describe, expect, it } from 'vitest';
import { bangkokHour, decidePtBooking } from '@/api/services/trainers/trainers/trainers.service';

const now = new Date('2026-10-15T11:42:00Z');
const base = { startsAt: '2026-10-16T10:00:00Z', minutes: 60, now, trainerSessions: [], sessionsLeft: 3, memberUpcoming: 0 };

describe('decidePtBooking (A.1 จองเทรนเนอร์)', () => {
  it('จองได้ในเวลาทำการเมื่อสมาชิกมีครั้ง PT เหลือ', () => {
    expect(bangkokHour(base.startsAt)).toBe(17);
    expect(decidePtBooking(base)).toEqual({ ok: true });
  });
  it('ห้ามเวลาซ้อนกับคิวที่จองไว้ แต่คิวที่ยกเลิกแล้วไม่นับ', () => {
    const busy = { startsAt: '2026-10-16T09:30:00Z', minutes: 60, status: 'booked' as const };
    expect(decidePtBooking({ ...base, trainerSessions: [busy] })).toEqual({ ok: false, reason: 'overlap' });
    expect(decidePtBooking({ ...base, trainerSessions: [{ ...busy, status: 'cancelled' }] })).toEqual({ ok: true });
    // ต่อกันพอดีไม่ถือว่าซ้อน
    expect(decidePtBooking({ ...base, trainerSessions: [{ ...busy, startsAt: '2026-10-16T09:00:00Z' }] })).toEqual({ ok: true });
  });
  it('หักคิวที่จองไว้แล้วออกจากครั้งที่เหลือ', () => {
    expect(decidePtBooking({ ...base, sessionsLeft: 3, memberUpcoming: 3 })).toEqual({ ok: false, reason: 'no-sessions' });
    expect(decidePtBooking({ ...base, sessionsLeft: 0 })).toEqual({ ok: false, reason: 'no-sessions' });
  });
  it('ปฏิเสธเวลาที่ผ่านมาแล้วและนอกเวลาทำการ 06:00–21:00', () => {
    expect(decidePtBooking({ ...base, startsAt: '2026-10-15T10:00:00Z' })).toEqual({ ok: false, reason: 'past' });
    expect(decidePtBooking({ ...base, startsAt: '2026-10-16T14:30:00Z' })).toEqual({ ok: false, reason: 'outside-hours' });
    expect(decidePtBooking({ ...base, startsAt: '2026-10-16T22:00:00Z' })).toEqual({ ok: false, reason: 'outside-hours' });
  });
});
