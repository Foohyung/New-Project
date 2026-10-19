import { multiplySatang, sumSatang } from '@repo/utils';

/** อัตราค่าบริการ (หน่วยสตางค์) */
export interface Rates {
  electricPerUnit: number;
  waterPerUnit: number;
  /** ค่าน้ำขั้นต่ำต่อเดือน */
  waterMinimum: number;
  commonFee: number;
}

export interface MeterReading {
  previous: number;
  current: number;
}

/** มิเตอร์ 4 หลัก วนกลับเป็น 0000 หลัง 9999 */
export const METER_MAX = 9999;

/** จำนวนหน่วยที่ใช้ รองรับมิเตอร์วนรอบ (A.2) */
export function unitsUsed(reading: MeterReading, max = METER_MAX): number {
  const { previous, current } = reading;
  if (![previous, current].every(v => Number.isInteger(v) && v >= 0 && v <= max)) throw new RangeError('ค่ามิเตอร์ไม่ถูกต้อง');
  return current >= previous ? current - previous : max - previous + 1 + current;
}

export interface InvoiceLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface Invoice {
  lines: InvoiceLine[];
  total: number;
  electricUnits: number;
  waterUnits: number;
}

/** คำนวณใบแจ้งหนี้รายเดือน — ทุกจำนวนเงินเป็นสตางค์ */
export function computeInvoice(input: { rent: number; rates: Rates; electric: MeterReading; water: MeterReading }): Invoice {
  const { rent, rates } = input;
  const electricUnits = unitsUsed(input.electric);
  const waterUnits = unitsUsed(input.water);
  const electric = multiplySatang(rates.electricPerUnit, electricUnits);
  const water = Math.max(multiplySatang(rates.waterPerUnit, waterUnits), rates.waterMinimum);
  const lines: InvoiceLine[] = [
    { label: 'ค่าเช่าห้อง', amount: rent },
    { label: 'ค่าไฟ', detail: `${electricUnits} หน่วย`, amount: electric },
    { label: 'ค่าน้ำ', detail: water === rates.waterMinimum && multiplySatang(rates.waterPerUnit, waterUnits) < rates.waterMinimum ? `${waterUnits} หน่วย (ขั้นต่ำ)` : `${waterUnits} หน่วย`, amount: water },
    { label: 'ค่าส่วนกลาง', amount: rates.commonFee },
  ];
  return { lines, total: sumSatang(lines.map(l => l.amount)), electricUnits, waterUnits };
}

/** สัดส่วนการเก็บเงิน (0–100) ปัดทศนิยม 1 ตำแหน่ง */
export function collectionRate(collected: number, billed: number): number {
  if (billed <= 0) return 0;
  return Math.round((collected / billed) * 1000) / 10;
}
