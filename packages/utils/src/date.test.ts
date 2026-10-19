import { describe, expect, it } from 'vitest';
import { addDays, bangkokDate, daysBetween, formatThaiDate, formatThaiDateOf, formatThaiDateTime, formatThaiTime, thaiGreeting } from './date';
import { formatThaiMobile, isThaiMobile } from './phone';

describe('date', () => {
  it('ใช้วันที่ตามเวลาไทย แม้ UTC ยังเป็นวันก่อน', () => {
    expect(bangkokDate(new Date('2026-10-14T18:30:00Z'))).toBe('2026-10-15');
  });

  it('นับจำนวนวันข้ามเดือนและปีอธิกสุรทิน', () => {
    expect(daysBetween('2026-10-15', '2026-10-18')).toBe(3);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-10-15', '2026-10-09')).toBe(-6);
  });

  it('บวกวัน', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('แสดงผลเป็นปี พ.ศ.', () => {
    expect(formatThaiDate('2026-10-15')).toBe('15 ต.ค. 2569');
    expect(formatThaiDate('2026-10-15', 'long')).toBe('15 ตุลาคม 2569');
    expect(formatThaiDateTime(new Date('2026-10-15T11:42:00Z'))).toBe('วันพฤหัสบดีที่ 15 ตุลาคม 2569 · 18:42 น.');
  });

  it('แสดงเวลาและคำทักทายตามเวลาไทย', () => {
    expect(formatThaiTime('2026-10-15T11:42:00Z')).toBe('18:42');
    expect(thaiGreeting(new Date('2026-10-15T01:00:00Z'))).toBe('สวัสดีตอนเช้า');
    expect(thaiGreeting(new Date('2026-10-15T11:42:00Z'))).toBe('สวัสดีตอนเย็น');
  });

  it('ปฏิเสธรูปแบบวันที่ผิด', () => {
    expect(() => daysBetween('15/10/2026', '2026-10-15')).toThrow(RangeError);
  });
});

describe('phone', () => {
  it('ตรวจและจัดรูปแบบเบอร์มือถือ', () => {
    expect(isThaiMobile('081-234-5678')).toBe(true);
    expect(isThaiMobile('02-123-4567')).toBe(false);
    expect(formatThaiMobile('0812345678')).toBe('081-234-5678');
  });
});

describe('formatThaiDateOf', () => {
  it('ใช้วันที่ตามเวลาไทย ไม่ใช่วันที่ UTC', () => {
    expect(formatThaiDateOf('2026-10-14T23:48:00Z')).toBe('15 ต.ค. 2569');
    expect(formatThaiDateOf('2026-10-15T11:42:00Z', 'long')).toBe('15 ตุลาคม 2569');
  });
});
