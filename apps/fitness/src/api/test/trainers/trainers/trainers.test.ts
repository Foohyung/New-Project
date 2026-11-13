import { beforeEach, describe, expect, it } from 'vitest';
import { bangkokHour, decidePtBooking } from '@/api/services/trainers/trainers/trainers.service';
import { deleteTrainer } from '@/api/dal/trainers/trainers/trainers.dal';
import { prisma } from '@/api/lib/db/db/db';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

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

describeDb('การลบเทรนเนอร์และรักษาตารางคลาส', () => {
  beforeEach(resetDatabase, 30_000);

  it('ย้ายตารางคลาสไปยังเทรนเนอร์ที่เลือกและคงตารางเดิมไว้', async () => {
    const source = await prisma().trainer.create({
      data: { name: 'เทรนเนอร์เดิม', nickname: 'เดิม', specialties: [], bio: '', color: 'var(--color-lime)' },
    });
    const replacement = await prisma().trainer.create({
      data: { name: 'เทรนเนอร์ใหม่', nickname: 'ใหม่', specialties: [], bio: '', color: 'var(--color-cyan)' },
    });
    const classRow = await prisma().gymClass.create({
      data: {
        title: 'คลาสทดสอบ',
        trainerId: source.id,
        room: 'ห้อง A',
        startsAt: new Date('2026-11-06T04:00:00Z'),
        minutes: 60,
        capacity: 10,
        level: 'ง่าย',
      },
    });

    const result = await deleteTrainer(USERS.manager, source.id, replacement.id);

    expect(result).toMatchObject({ name: 'เทรนเนอร์เดิม', replacementTrainerId: replacement.id, replacementTrainerName: 'ใหม่', classIds: [classRow.id] });
    expect(await prisma().trainer.findUnique({ where: { id: source.id } })).toBeNull();
    expect(await prisma().gymClass.findUnique({ where: { id: classRow.id } })).toMatchObject({ trainerId: replacement.id });
  });

  it('บล็อกการลบเมื่อมีตารางคลาสแต่ไม่ได้เลือกผู้สอนใหม่', async () => {
    const source = await prisma().trainer.create({
      data: { name: 'เทรนเนอร์เดิม', nickname: 'เดิม', specialties: [], bio: '', color: 'var(--color-lime)' },
    });
    await prisma().gymClass.create({
      data: {
        title: 'คลาสทดสอบ',
        trainerId: source.id,
        room: 'ห้อง A',
        startsAt: new Date('2026-11-06T04:00:00Z'),
        minutes: 60,
        capacity: 10,
        level: 'ง่าย',
      },
    });

    await expect(deleteTrainer(USERS.manager, source.id, null)).rejects.toThrow('TRAINER_REASSIGN_REQUIRED');
    expect(await prisma().trainer.findUnique({ where: { id: source.id } })).not.toBeNull();
  });
});
