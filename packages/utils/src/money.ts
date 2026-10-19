/**
 * เงินทุกจำนวนในระบบเป็นจำนวนเต็มหน่วย "สตางค์" (§4.2) — ห้ามคำนวณเงินด้วยทศนิยม
 */

function assertSatang(value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`จำนวนเงินต้องเป็นสตางค์แบบจำนวนเต็ม ได้รับ ${String(value)}`);
}

/** แปลงบาทเป็นสตางค์ (ใช้ตอนรับค่าจากผู้ใช้หรือ seed เท่านั้น) */
export function toSatang(baht: number): number {
  if (!Number.isFinite(baht)) throw new RangeError('จำนวนบาทไม่ถูกต้อง');
  return Math.round(baht * 100);
}

/** รวมจำนวนเงิน (สตางค์) */
export function sumSatang(values: readonly number[]): number {
  return values.reduce((total, v) => {
    assertSatang(v);
    return total + v;
  }, 0);
}

/** คูณจำนวนหน่วยกับราคาต่อหน่วย (สตางค์) แล้วปัดเป็นสตางค์ */
export function multiplySatang(unitPrice: number, quantity: number): number {
  assertSatang(unitPrice);
  return Math.round(unitPrice * quantity);
}

const formatters = new Map<boolean, Intl.NumberFormat>();

/** แสดงผลเงินบาท เช่น 123450 → "฿1,234.50" หรือ "฿1,235" (ค่าเริ่มต้นไม่แสดงสตางค์) */
export function formatBaht(satang: number, options: { showSatang?: boolean } = {}): string {
  assertSatang(satang);
  const showSatang = options.showSatang ?? false;
  let fmt = formatters.get(showSatang);
  if (!fmt) {
    fmt = new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: showSatang ? 2 : 0,
      maximumFractionDigits: showSatang ? 2 : 0,
    });
    formatters.set(showSatang, fmt);
  }
  return fmt.format(satang / 100);
}
