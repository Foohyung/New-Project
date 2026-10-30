import { describe, expect, it } from 'vitest';
import { eachDay, futurePresetRanges, inRange, parseRange, presetRanges, rangeLabel } from '@/api/services/shared/shared/shared.date-range';

const today = '2026-10-15';

describe('parseRange', () => {
  it('ไม่ใส่วันที่ใช้ค่าเริ่มต้น', () => {
    expect(parseRange({}, today)).toBeNull();
    expect(parseRange({}, today, { from: '2026-10-01', to: today })).toEqual({ from: '2026-10-01', to: today });
  });
  it('ใส่ฝั่งเดียว และกลับด้านให้อัตโนมัติ', () => {
    expect(parseRange({ from: '2026-10-10' }, today)).toEqual({ from: '2026-10-10', to: today });
    expect(parseRange({ to: '2026-10-10' }, today)).toEqual({ from: '2026-09-11', to: '2026-10-10' });
    expect(parseRange({ from: '2026-10-12', to: '2026-10-01' }, today)).toEqual({ from: '2026-10-01', to: '2026-10-12' });
  });
  it('ตัดค่าผิดรูปแบบ และจำกัดไม่เกิน 1 ปี', () => {
    expect(parseRange({ from: '2026-13-40', to: 'x' }, today)).toBeNull();
    expect(parseRange({ from: ['2026-10-01'] }, today)).toBeNull();
    expect(parseRange({ from: '2020-01-01', to: today }, today)).toEqual({ from: '2025-10-15', to: today });
  });
});

describe('ตัวช่วยช่วงวันที่', () => {
  it('ช่วงด่วน เดือนนี้/เดือนก่อน', () => {
    const p = Object.fromEntries(presetRanges(today).map(x => [x.key, x.range]));
    expect(p.month).toEqual({ from: '2026-10-01', to: today });
    expect(p['last-month']).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(p['7d']).toEqual({ from: '2026-10-09', to: today });
  });
  it('นับทุกวันในช่วง และตรวจว่าอยู่ในช่วง (รวมขอบ)', () => {
    expect(eachDay({ from: '2026-09-29', to: '2026-10-02' })).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(inRange('2026-10-02', { from: '2026-09-29', to: '2026-10-02' })).toBe(true);
    expect(inRange('2026-10-03', { from: '2026-09-29', to: '2026-10-02' })).toBe(false);
    expect(inRange('2000-01-01', null)).toBe(true);
  });
  it('ช่วงด่วนไปข้างหน้า (วันหมดอายุ)', () => {
    const p = Object.fromEntries(futurePresetRanges(today).map(x => [x.key, x.range]));
    expect(p.next7).toEqual({ from: today, to: '2026-10-21' });
    expect(p['next-month']).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(p.past30).toEqual({ from: '2026-09-15', to: '2026-10-14' });
  });
  it('ป้ายช่วงวันที่', () => {
    expect(rangeLabel(null)).toBe('ทุกช่วงเวลา');
    expect(rangeLabel({ from: today, to: today })).toBe('15 ตุลาคม 2569');
  });
});
