import { inRange, type DateRange } from '../shared/date-range';

/** บัญชีรายรับ-รายจ่ายของ agent — เงินเป็นสตางค์ วันที่ YYYY-MM-DD */

export const INCOME_CATEGORIES = ['commission-sale', 'commission-rent', 'other-income'] as const;
export const EXPENSE_CATEGORIES = ['co-agent', 'listing-fee', 'advertising', 'photo', 'travel', 'other-expense'] as const;
export type LedgerCategory = (typeof INCOME_CATEGORIES)[number] | (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<LedgerCategory, string> = {
  'commission-sale': 'ค่าคอมขาย',
  'commission-rent': 'ค่าคอมเช่า',
  'other-income': 'รายรับอื่น',
  'co-agent': 'แบ่งค่าคอม co-agent',
  'listing-fee': 'ค่าลงประกาศ',
  advertising: 'ค่าโฆษณา',
  photo: 'ค่าถ่ายภาพ',
  travel: 'ค่าเดินทาง',
  'other-expense': 'รายจ่ายอื่น',
};

export type LedgerKind = 'income' | 'expense';
export type LedgerStatus = 'settled' | 'pending';

export interface LedgerEntry {
  id: string;
  date: string;
  kind: LedgerKind;
  category: LedgerCategory;
  description: string;
  /** จำนวนเงินเต็ม (สตางค์) */
  amount: number;
  /** ภาษีหัก ณ ที่จ่ายที่ผู้จ่ายหักไว้ (สตางค์) — ค่าคอมโดยทั่วไป 3% */
  withholding: number;
  /** settled = รับ/จ่ายแล้ว · pending = ค้างรับ/ค้างจ่าย (ยังไม่นับเป็นรายรับ) */
  status: LedgerStatus;
  propertyId: string | null;
  agentId: string;
}

export const isCommission = (c: LedgerCategory) => c === 'commission-sale' || c === 'commission-rent';
export const kindOf = (c: LedgerCategory): LedgerKind => ((INCOME_CATEGORIES as readonly string[]).includes(c) ? 'income' : 'expense');

/** หัก ณ ที่จ่าย 3% ของค่าคอม (ปัดเป็นสตางค์) */
export const withholdingFor = (amount: number) => Math.round((amount * 3) / 100);

export interface LedgerTotals {
  income: number;
  commission: number;
  expense: number;
  withholding: number;
  /** กำไรก่อนภาษี = รายรับ - รายจ่าย (เฉพาะรายการที่รับ/จ่ายแล้ว) */
  net: number;
  /** เงินที่ได้รับจริง = รายรับ - หัก ณ ที่จ่าย - รายจ่าย */
  cash: number;
  pending: number;
}

export function ledgerTotals(entries: readonly LedgerEntry[]): LedgerTotals {
  let income = 0, commission = 0, expense = 0, withholding = 0, pending = 0;
  for (const e of entries) {
    if (e.status === 'pending') {
      if (e.kind === 'income') pending += e.amount;
      continue;
    }
    if (e.kind === 'income') {
      income += e.amount;
      withholding += e.withholding;
      if (isCommission(e.category)) commission += e.amount;
    } else expense += e.amount;
  }
  return { income, commission, expense, withholding, net: income - expense, cash: income - withholding - expense, pending };
}

export interface MonthSummary {
  month: string;
  income: number;
  commission: number;
  expense: number;
  net: number;
}

/** สรุปรายเดือนของรายการที่รับ/จ่ายแล้ว ครบทุกเดือนในช่วง (เดือนที่ไม่มีรายการเป็น 0) */
export function monthlySummary(entries: readonly LedgerEntry[], range: DateRange): MonthSummary[] {
  const months: string[] = [];
  for (let m = range.from.slice(0, 7); m <= range.to.slice(0, 7); m = nextMonth(m)) months.push(m);
  return months.map(month => {
    const t = ledgerTotals(entries.filter(e => e.date.startsWith(month)));
    return { month, income: t.income, commission: t.commission, expense: t.expense, net: t.net };
  });
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return m === 12 ? `${String(y + 1)}-01` : `${String(y)}-${String(m + 1).padStart(2, '0')}`;
}

export function byCategory(entries: readonly LedgerEntry[], kind: LedgerKind): { category: LedgerCategory; amount: number }[] {
  const sums = new Map<LedgerCategory, number>();
  for (const e of entries) if (e.kind === kind && e.status === 'settled') sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
  return [...sums].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export interface LedgerFilter {
  range: DateRange | null;
  kind?: LedgerKind;
}

export function filterLedger(entries: readonly LedgerEntry[], filter: LedgerFilter): LedgerEntry[] {
  return entries
    .filter(e => inRange(e.date, filter.range) && (!filter.kind || e.kind === filter.kind))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/** CSV สำหรับ Excel: มี BOM ให้อ่านภาษาไทยได้ และกัน formula injection ของค่าที่ขึ้นต้นด้วย = + - @ (§10) */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map(r => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

const baht = (satang: number) => (satang / 100).toFixed(2);

export function ledgerCsv(entries: readonly LedgerEntry[], propertyCode: (id: string | null) => string): string {
  return toCsv([
    ['วันที่', 'ประเภท', 'หมวด', 'รายละเอียด', 'รหัสทรัพย์', 'จำนวนเงิน (บาท)', 'หัก ณ ที่จ่าย (บาท)', 'สุทธิ (บาท)', 'สถานะ'],
    ...entries.map(e => [
      e.date,
      e.kind === 'income' ? 'รายรับ' : 'รายจ่าย',
      CATEGORY_LABEL[e.category],
      e.description,
      propertyCode(e.propertyId),
      baht(e.amount),
      baht(e.withholding),
      baht(e.kind === 'income' ? e.amount - e.withholding : -e.amount),
      e.status === 'pending' ? (e.kind === 'income' ? 'ค้างรับ' : 'ค้างจ่าย') : e.kind === 'income' ? 'รับแล้ว' : 'จ่ายแล้ว',
    ]),
  ]);
}
