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

/** เลขใบเสร็จต่อเนื่อง เช่น RC-6910-0110 (ปี พ.ศ. 2 หลัก + เดือน) */
export function receiptNo(sequence: number, date: string): string {
  const [year, month] = date.split('-');
  return `RC-${String(Number(year) + 543).slice(-2)}${month ?? '00'}-${String(sequence).padStart(4, '0')}`;
}
