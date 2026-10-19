import { describe, expect, it } from 'vitest';
import { renderTemplate, roundForDaysLeft, unknownVars, type ReminderRound } from './service';

const round = (id: ReminderRound['id'], offsetDays: number, enabled = true): ReminderRound => ({ id, offsetDays, enabled, channels: ['line'], template: '', couponCode: null });
const rounds = [round('before-7', -7), round('before-3', -3), round('on-day', 0), round('after-7', 7, false)];

describe('roundForDaysLeft', () => {
  it('เลือกรอบตามจำนวนวันที่เหลือ', () => {
    expect(roundForDaysLeft(7, rounds)?.id).toBe('before-7');
    expect(roundForDaysLeft(3, rounds)?.id).toBe('before-3');
    expect(roundForDaysLeft(0, rounds)?.id).toBe('on-day');
    expect(roundForDaysLeft(5, rounds)).toBeUndefined();
  });
  it('ไม่ส่งรอบที่ปิดอยู่ หรือไม่ได้เลือกช่องทาง', () => {
    expect(roundForDaysLeft(-7, rounds)).toBeUndefined();
    expect(roundForDaysLeft(7, [{ ...round('before-7', -7), channels: [] }])).toBeUndefined();
  });
});

describe('renderTemplate', () => {
  it('แทนตัวแปร และคงตัวแปรที่ไม่รู้จัก', () => {
    expect(renderTemplate('สวัสดีคุณ{ชื่อ} หมด {วันหมดอายุ} {อื่นๆ}', { ชื่อ: 'มิ้นท์', วันหมดอายุ: '18 ต.ค.' })).toBe('สวัสดีคุณมิ้นท์ หมด 18 ต.ค. {อื่นๆ}');
  });
  it('บอกตัวแปรที่พิมพ์ผิด', () => {
    expect(unknownVars('{ชื่อ} {ชือ} {ลิงก์ชำระ}')).toEqual(['ชือ']);
  });
});
