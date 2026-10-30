import { describe, expect, it } from 'vitest';
import { byCategory, filterLedger, kindOf, ledgerCsv, ledgerTotals, monthlySummary, toCsv, withholdingFor, type LedgerEntry } from './service';

let n = 0;
const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: `l${String(++n)}`, date: '2026-10-05', kind: 'income', category: 'commission-rent', description: 'ดีลเช่า', amount: 3_200_000,
  withholding: 96_000, status: 'settled', propertyId: 'p1', agentId: 'ag-1', ...over,
});

const entries = [
  entry({ date: '2026-09-25', category: 'commission-sale', amount: 5_400_000, withholding: 162_000 }),
  entry({ date: '2026-10-05' }),
  entry({ date: '2026-10-12', kind: 'expense', category: 'co-agent', amount: 960_000, withholding: 0 }),
  entry({ date: '2026-10-19', kind: 'expense', category: 'travel', amount: 85_000, withholding: 0 }),
  entry({ date: '2026-10-30', category: 'commission-sale', amount: 8_850_000, withholding: 265_500, status: 'pending' }),
  entry({ date: '2026-10-20', kind: 'income', category: 'other-income', amount: 100_000, withholding: 0 }),
];

describe('ยอดรวมบัญชี', () => {
  it('รายการค้างรับไม่นับเป็นรายรับ แต่แสดงแยกเป็นยอดค้างรับ', () => {
    const t = ledgerTotals(entries);
    expect(t.income).toBe(5_400_000 + 3_200_000 + 100_000);
    expect(t.commission).toBe(8_600_000);
    expect(t.expense).toBe(1_045_000);
    expect(t.withholding).toBe(258_000);
    expect(t.net).toBe(8_700_000 - 1_045_000);
    expect(t.cash).toBe(8_700_000 - 258_000 - 1_045_000);
    expect(t.pending).toBe(8_850_000);
  });
  it('หัก ณ ที่จ่าย 3% ปัดเป็นสตางค์', () => {
    expect(withholdingFor(8_850_000)).toBe(265_500);
    expect(withholdingFor(333)).toBe(10);
  });
  it('รู้ประเภทจากหมวด', () => {
    expect(kindOf('commission-sale')).toBe('income');
    expect(kindOf('travel')).toBe('expense');
  });
});

describe('สรุปรายเดือนและแยกหมวด', () => {
  it('มีครบทุกเดือนในช่วง แม้เดือนนั้นไม่มีรายการ', () => {
    const m = monthlySummary(entries, { from: '2026-08-01', to: '2026-10-31' });
    expect(m.map(x => x.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(m[0]).toMatchObject({ income: 0, expense: 0 });
    expect(m[2]).toMatchObject({ income: 3_300_000, commission: 3_200_000, expense: 1_045_000, net: 2_255_000 });
  });
  it('ข้ามปีได้', () => {
    expect(monthlySummary([], { from: '2025-11-15', to: '2026-02-01' }).map(x => x.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('รวมตามหมวด เรียงมากไปน้อย', () => {
    expect(byCategory(entries, 'expense')).toEqual([{ category: 'co-agent', amount: 960_000 }, { category: 'travel', amount: 85_000 }]);
  });
  it('กรองช่วงวันที่และประเภท เรียงใหม่ไปเก่า', () => {
    const list = filterLedger(entries, { range: { from: '2026-10-01', to: '2026-10-31' }, kind: 'expense' });
    expect(list.map(e => e.date)).toEqual(['2026-10-19', '2026-10-12']);
  });
});

describe('CSV', () => {
  it('มี BOM, ใส่เครื่องหมายคำพูดเมื่อจำเป็น และกัน formula injection', () => {
    const csv = toCsv([['a,b', '=1+1', 'ปกติ', -5]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"a,b",\'=1+1,ปกติ,-5');
  });
  it('ส่งออกรายการเป็นบาท 2 ตำแหน่งพร้อมยอดสุทธิ', () => {
    const csv = ledgerCsv([entries[1]!, entries[2]!], id => (id === 'p1' ? 'BH-101' : ''));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-10-05,รายรับ,ค่าคอมเช่า,ดีลเช่า,BH-101,32000.00,960.00,31040.00,รับแล้ว');
    expect(lines[2]).toContain('-9600.00,จ่ายแล้ว');
  });
});
