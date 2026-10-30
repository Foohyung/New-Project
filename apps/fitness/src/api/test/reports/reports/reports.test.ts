import { describe, expect, it } from 'vitest';
import { average, mergeDaily, sumRange, toCsv } from '@/api/services/reports/reports/reports.service';

describe('รวมยอดรายวัน', () => {
  it('รวมค่าวันเดียวกันจากหลายชุดและเรียงตามวัน', () => {
    const merged = mergeDaily([{ date: '2026-10-02', value: 5 }, { date: '2026-10-01', value: 1 }], [{ date: '2026-10-02', value: 2 }]);
    expect(merged).toEqual([{ date: '2026-10-01', value: 1 }, { date: '2026-10-02', value: 7 }]);
    expect(sumRange(merged, '2026-10-02', '2026-10-31')).toBe(7);
    expect(average([])).toBe(0);
  });
});

describe('toCsv', () => {
  it('มี BOM สำหรับ Excel ภาษาไทย และ escape เครื่องหมายคำพูด', () => {
    const csv = toCsv([['ชื่อ', 'หมายเหตุ'], ['ณัฐพล', 'พูดว่า "สวัสดี", ครับ']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"พูดว่า ""สวัสดี"", ครับ"');
  });
  it('กัน CSV injection โดยใส่ \' หน้าค่าที่ขึ้นต้นเหมือนสูตร', () => {
    expect(toCsv([['=HYPERLINK("x")', -5]])).toContain(`"'=HYPERLINK(""x"")",-5`);
  });
});
