/** ฟังก์ชันรวมยอดสำหรับรายงาน (pure) */

export interface DailyValue {
  date: string;
  value: number;
}

/** รวมค่าหลายชุดตามวันที่ แล้วเรียงตามวัน */
export function mergeDaily(...series: DailyValue[][]): DailyValue[] {
  const map = new Map<string, number>();
  for (const s of series) for (const { date, value } of s) map.set(date, (map.get(date) ?? 0) + value);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

/** รวมค่าในช่วงวันที่ (รวมทั้งสองฝั่ง) */
export function sumRange(series: DailyValue[], from: string, to: string): number {
  return series.filter(d => d.date >= from && d.date <= to).reduce((sum, d) => sum + d.value, 0);
}

export function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** สร้าง CSV ที่เปิดใน Excel ภาษาไทยได้ (มี BOM และ escape เครื่องหมายคำพูด/สูตร) */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    // กัน CSV injection: ค่าที่ขึ้นต้นด้วย = + - @ จะถูกตีความเป็นสูตรใน Excel
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
