/**
 * วันที่: เก็บเป็น UTC / วันที่แบบ "YYYY-MM-DD" และแสดงผลเป็นเวลาไทย ปี พ.ศ. (§4.2)
 */
export const BANGKOK = 'Asia/Bangkok';

/** วันที่ไม่มีเวลา รูปแบบ YYYY-MM-DD */
export type IsoDate = `${number}-${number}-${number}`;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: string): number {
  const m = ISO_DATE.exec(value);
  if (!m) throw new RangeError(`รูปแบบวันที่ต้องเป็น YYYY-MM-DD ได้รับ "${value}"`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** วันที่ตามเวลาไทยของ instant ที่ให้มา */
export function bangkokDate(instant: Date): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant) as IsoDate;
}

/** จำนวนวันจาก `from` ถึง `to` (ติดลบถ้า `to` อยู่ก่อน) */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to) - parseIsoDate(from)) / 86_400_000);
}

/** บวกวันให้วันที่ YYYY-MM-DD */
export function addDays(date: string, days: number): IsoDate {
  return new Date(parseIsoDate(date) + days * 86_400_000).toISOString().slice(0, 10) as IsoDate;
}

/** แสดงวันที่แบบไทย เช่น "15 ต.ค. 2569" หรือ "15 ตุลาคม 2569" */
export function formatThaiDate(date: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: style, year: 'numeric' }).format(parseIsoDate(date));
}

/** แสดงเวลาไทยแบบ 24 ชั่วโมง เช่น "18:42" */
export function formatThaiTime(instant: Date | string): string {
  return new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(instant));
}

/** คำทักทายตามช่วงเวลาไทย */
export function thaiGreeting(instant: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: BANGKOK, hour: '2-digit', hour12: false }).format(instant));
  if (hour < 12) return 'สวัสดีตอนเช้า';
  if (hour < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

/** แสดงวันและเวลาไทย เช่น "วันพฤหัสบดีที่ 15 ตุลาคม 2569 · 18:42 น." */
export function formatThaiDateTime(instant: Date): string {
  const date = new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(instant);
  const time = new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK, hour: '2-digit', minute: '2-digit', hour12: false }).format(instant);
  return `${date} · ${time} น.`;
}

/** แสดงวันที่แบบไทยของ instant ตามเวลาไทย (เช่น 23:48Z ของวันที่ 14 = 15 ต.ค. ตามเวลาไทย) */
export function formatThaiDateOf(instant: Date | string, style: 'short' | 'long' = 'short'): string {
  return formatThaiDate(bangkokDate(new Date(instant)), style);
}
