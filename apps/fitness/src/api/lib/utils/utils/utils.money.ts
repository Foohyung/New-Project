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

const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** อ่านตัวเลขไม่เกิน 6 หลักเป็นภาษาไทย (`hasHigher` = มีหลักล้านขึ้นไปนำหน้า ใช้ตัดสิน "เอ็ด") */
function readGroup(n: number, hasHigher: boolean): string {
  const digits = String(n).split('').map(Number).reverse();
  let text = '';
  digits.forEach((d, place) => {
    if (d === 0) return;
    if (place === 0) text = (d === 1 && (n > 1 || hasHigher) ? 'เอ็ด' : (DIGITS[d] ?? '')) + text;
    else if (place === 1) text = (d === 1 ? '' : d === 2 ? 'ยี่' : (DIGITS[d] ?? '')) + 'สิบ' + text;
    else text = (DIGITS[d] ?? '') + (PLACES[place] ?? '') + text;
  });
  return text;
}

function readNumber(n: number): string {
  if (n === 0) return 'ศูนย์';
  const groups: number[] = [];
  for (let rest = n; rest > 0; rest = Math.floor(rest / 1_000_000)) groups.push(rest % 1_000_000);
  return groups
    .map((g, i) => (g === 0 ? '' : readGroup(g, i < groups.length - 1) + 'ล้าน'.repeat(i)))
    .reverse()
    .join('');
}

/** จำนวนเงินเป็นตัวอักษรภาษาไทย สำหรับใบเสร็จ เช่น 120050 → "หนึ่งพันสองร้อยบาทห้าสิบสตางค์" */
export function bahtText(satang: number): string {
  assertSatang(satang);
  if (satang < 0) return `ลบ${bahtText(-satang)}`;
  const baht = Math.floor(satang / 100);
  const st = satang % 100;
  const bahtPart = baht > 0 || st === 0 ? `${readNumber(baht)}บาท` : '';
  return st === 0 ? `${bahtPart}ถ้วน` : `${bahtPart}${readNumber(st)}สตางค์`;
}
