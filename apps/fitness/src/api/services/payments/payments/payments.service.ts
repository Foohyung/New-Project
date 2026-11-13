/** การชำระเงิน: PromptPay QR (มาตรฐาน EMVCo ของ ธปท.) เลขใบเสร็จ และป้ายกำกับ */

export type PaymentMethod = 'promptpay' | 'card' | 'cash' | 'transfer';
export type PaymentStatus = 'pending' | 'review' | 'paid';

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  promptpay: 'PromptPay',
  card: 'บัตรเครดิต/เดบิต',
  cash: 'เงินสด',
  transfer: 'โอนผ่านธนาคาร',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'รอชำระ',
  review: 'รอตรวจสลิป',
  paid: 'ชำระแล้ว',
};

/** วิธีชำระที่ยืนยันได้ทันทีที่เคาน์เตอร์ (PromptPay/โอนต้องตรวจสลิปก่อน) */
export function isInstantMethod(method: PaymentMethod): boolean {
  return method === 'cash' || method === 'card';
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) ตามที่ EMVCo QR กำหนด */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/**
 * ข้อความ PromptPay QR แบบระบุยอดเงิน
 * @param target เบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี/บัตรประชาชน 13 หลัก
 */
export function promptPayPayload(target: string, amountSatang: number): string {
  const digits = target.replace(/\D/g, '');
  if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) throw new RangeError('ยอดเงินต้องเป็นสตางค์จำนวนเต็มที่มากกว่า 0');
  const account =
    digits.length === 10 ? tlv('01', `0066${digits.slice(1)}`)
    : digits.length === 13 ? tlv('02', digits)
    : (() => { throw new RangeError('PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลักหรือเลข 13 หลัก'); })();
  const amount = `${String(Math.floor(amountSatang / 100))}.${String(amountSatang % 100).padStart(2, '0')}`;
  const body = tlv('00', '01') + tlv('01', '12') + tlv('29', tlv('00', 'A000000677010111') + account) + tlv('53', '764') + tlv('54', amount) + tlv('58', 'TH') + '6304';
  return body + crc16(body);
}

/* ---------- เลขที่ใบเสร็จ (แต่ละสาขาตั้งรูปแบบเองได้ที่ /payment-settings) ---------- */

/**
 * รูปแบบเลขที่ใบเสร็จ: ข้อความใดก็ได้ + ตัวแปร {YYYY} ปี พ.ศ. · {YY} ปี พ.ศ. 2 หลัก · {MM} เดือน · {DD} วัน · {####} เลขรัน (จำนวน # = จำนวนหลัก)
 * เลขรันนับต่อจากเลขสูงสุดที่ออกไปแล้วในรูปแบบเดียวกัน จึงเริ่ม 1 ใหม่เองเมื่อปี/เดือนในรูปแบบเปลี่ยน
 */
export const DEFAULT_RECEIPT_FORMAT = 'RC-{YY}{MM}-{####}';
export const RECEIPT_NO_MAX = 30;
const TOKEN = /\{(YYYY|YY|MM|DD|#{1,8})\}/g;

function tokenValue(token: string, date: string): string {
  const [y = '0', m = '00', d = '00'] = date.split('-');
  const be = String(Number(y) + 543);
  return token === 'YYYY' ? be : token === 'YY' ? be.slice(-2) : token === 'MM' ? m : d;
}

/** ข้อความผิดพลาดของรูปแบบ หรือ null = ใช้ได้ */
export function receiptFormatError(format: string): string | null {
  if (!format.trim()) return 'กรอกรูปแบบเลขที่ใบเสร็จ';
  const runs = format.match(/\{#{1,8}\}/g) ?? [];
  if (runs.length !== 1) return 'ต้องมีเลขรัน {####} 1 ตำแหน่ง (ใส่ # 1–8 ตัว)';
  const rest = format.replace(TOKEN, '');
  if (/[{}]/.test(rest)) return 'ใช้ได้เฉพาะ {YYYY} {YY} {MM} {DD} และ {####}';
  if (!/^[\p{L}\p{M}\p{N} ._/#-]*$/u.test(rest)) return 'ข้อความในรูปแบบใช้ได้เฉพาะตัวอักษร ตัวเลข ช่องว่าง และ - _ / . #';
  if (formatReceiptNo(format, 1, '2026-12-31').length > RECEIPT_NO_MAX) return `เลขที่ใบเสร็จยาวได้ไม่เกิน ${String(RECEIPT_NO_MAX)} ตัวอักษร`;
  return null;
}

/** เลขที่ใบเสร็จของลำดับ `sequence` ในวันที่ `date` (YYYY-MM-DD) */
export function formatReceiptNo(format: string, sequence: number, date: string): string {
  return format.replace(TOKEN, (_, token: string) => (token.startsWith('#') ? String(sequence).padStart(token.length, '0') : tokenValue(token, date)));
}

/** ส่วนหน้าเลขรัน (ใช้ค้นเลขที่ออกไปแล้ว) + ตัวอ่านเลขรันกลับจากเลขที่ใบเสร็จ */
export function receiptSequenceReader(format: string, date: string): { prefix: string; read: (receiptNo: string) => number | null } {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let prefix: string | null = null;
  let pattern = '';
  let last = 0;
  for (const m of format.matchAll(TOKEN)) {
    const literal = format.slice(last, m.index);
    const token = m[1] ?? '';
    if (token.startsWith('#')) {
      prefix ??= formatReceiptNo(format.slice(0, m.index), 0, date);
      pattern += `${escape(formatReceiptNo(literal, 0, date))}(\\d{${String(token.length)},})`;
    } else {
      pattern += escape(literal + tokenValue(token, date));
    }
    last = m.index + m[0].length;
  }
  pattern += escape(format.slice(last));
  const regex = new RegExp(`^${pattern}$`);
  return { prefix: prefix ?? '', read: no => { const hit = regex.exec(no)?.[1]; return hit ? Number(hit) : null; } };
}

/** เลขใบเสร็จรูปแบบเริ่มต้น เช่น RC-6910-0110 (ปี พ.ศ. 2 หลัก + เดือน) */
export function receiptNo(sequence: number, date: string): string {
  return formatReceiptNo(DEFAULT_RECEIPT_FORMAT, sequence, date);
}

export const VAT_RATE_PCT = 7;

/** แยกภาษีมูลค่าเพิ่มจากราคาที่รวม VAT แล้ว (ราคาแพ็กเกจเป็นราคารวม VAT) */
export function vatFromInclusive(totalSatang: number, ratePct = VAT_RATE_PCT): { baseSatang: number; vatSatang: number } {
  const baseSatang = Math.round((totalSatang * 100) / (100 + ratePct));
  return { baseSatang, vatSatang: totalSatang - baseSatang };
}
