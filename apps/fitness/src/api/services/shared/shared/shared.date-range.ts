import { addDays, daysBetween, formatThaiDate } from '@/api/lib/utils/utils/utils';

/** ช่วงวันที่แบบรวมทั้งสองฝั่ง (YYYY-MM-DD ตามเวลาไทย) */
export interface DateRange {
  from: string;
  to: string;
}

export const MAX_RANGE_DAYS = 366;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const valid = (v: unknown): v is string => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/**
 * อ่านช่วงวันที่จาก query string อย่างปลอดภัย
 * - ค่าผิดรูปแบบถูกตัดทิ้ง · ใส่แค่ฝั่งเดียวก็ได้ · กลับด้านให้อัตโนมัติ · ยาวเกิน 1 ปีตัดให้เหลือ 1 ปี
 * - ไม่ได้ใส่เลย = fallback (null = ไม่กรอง)
 */
export function parseRange(input: { from?: unknown; to?: unknown }, today: string, fallback: DateRange | null = null): DateRange | null {
  const from = valid(input.from) ? input.from : null;
  const to = valid(input.to) ? input.to : null;
  if (!from && !to) return fallback;
  let range: DateRange = { from: from ?? addDays(to ?? today, -29), to: to ?? today };
  if (range.from > range.to) range = { from: range.to, to: range.from };
  if (daysBetween(range.from, range.to) >= MAX_RANGE_DAYS) range = { from: addDays(range.to, -(MAX_RANGE_DAYS - 1)), to: range.to };
  return range;
}

export function inRange(date: string, range: DateRange | null): boolean {
  return !range || (date >= range.from && date <= range.to);
}

export function eachDay(range: DateRange): string[] {
  return Array.from({ length: daysBetween(range.from, range.to) + 1 }, (_, i) => addDays(range.from, i));
}

export function monthStart(date: string): string {
  return `${date.slice(0, 8)}01`;
}

export function presetRanges(today: string): { key: string; label: string; range: DateRange }[] {
  const thisMonth = monthStart(today);
  const lastMonthEnd = addDays(thisMonth, -1);
  return [
    { key: 'today', label: 'วันนี้', range: { from: today, to: today } },
    { key: '7d', label: '7 วัน', range: { from: addDays(today, -6), to: today } },
    { key: '30d', label: '30 วัน', range: { from: addDays(today, -29), to: today } },
    { key: 'month', label: 'เดือนนี้', range: { from: thisMonth, to: today } },
    { key: 'last-month', label: 'เดือนก่อน', range: { from: monthStart(lastMonthEnd), to: lastMonthEnd } },
  ];
}

/** ช่วงด่วนแบบมองไปข้างหน้า (เช่น วันหมดอายุ) */
export function futurePresetRanges(today: string): { key: string; label: string; range: DateRange }[] {
  const nextMonthStart = monthStart(addDays(monthStart(today), 31));
  return [
    { key: 'today', label: 'วันนี้', range: { from: today, to: today } },
    { key: 'next7', label: '7 วันข้างหน้า', range: { from: today, to: addDays(today, 6) } },
    { key: 'next30', label: '30 วันข้างหน้า', range: { from: today, to: addDays(today, 29) } },
    { key: 'next-month', label: 'เดือนหน้า', range: { from: nextMonthStart, to: addDays(monthStart(addDays(nextMonthStart, 31)), -1) } },
    { key: 'past30', label: 'หมดไปแล้ว 30 วัน', range: { from: addDays(today, -30), to: addDays(today, -1) } },
  ];
}

export function rangeLabel(range: DateRange | null): string {
  if (!range) return 'ทุกช่วงเวลา';
  return range.from === range.to ? formatThaiDate(range.from, 'long') : `${formatThaiDate(range.from)} – ${formatThaiDate(range.to)}`;
}

export function sameRange(a: DateRange | null, b: DateRange | null): boolean {
  return a?.from === b?.from && a?.to === b?.to;
}
