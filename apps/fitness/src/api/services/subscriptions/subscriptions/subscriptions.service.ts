/** ต่ออายุอัตโนมัติด้วยบัตร (pure) — ระยะที่ 1 จำลองการตัดบัตร ไม่เก็บเลขบัตรจริง */
import { addDays } from '@/api/lib/utils/utils/utils';

/** ตัดบัตรก่อนวันหมดอายุ 3 วัน (สมาชิกได้รับแจ้งล่วงหน้า) */
export const CHARGE_DAYS_BEFORE_EXPIRY = 3;
/** ตัดไม่ผ่านแล้วลองใหม่หลังวันครบกำหนด 1, 3, 5 วัน จากนั้นหยุดและแจ้งสมาชิก */
export const RETRY_AFTER_DAYS = [1, 3, 5] as const;

export interface SavedCard {
  brand: 'visa' | 'mastercard';
  last4: string;
  exp: string;
}

/** บัตรทดสอบสำหรับโหมดทดลอง (แบบเดียวกับ test card ของ payment gateway) */
export const TEST_CARDS: (SavedCard & { label: string; declineReason: string | null })[] = [
  { brand: 'visa', last4: '4242', exp: '08/28', label: 'Visa •••• 4242 (ตัดผ่าน)', declineReason: null },
  { brand: 'mastercard', last4: '5454', exp: '11/27', label: 'Mastercard •••• 5454 (ตัดผ่าน)', declineReason: null },
  { brand: 'visa', last4: '0002', exp: '02/27', label: 'Visa •••• 0002 (ถูกปฏิเสธ)', declineReason: 'บัตรถูกปฏิเสธ (วงเงินไม่พอ)' },
];

export function chargeDueOn(expiresOn: string): string {
  return addDays(expiresOn, -CHARGE_DAYS_BEFORE_EXPIRY);
}

/** วันลองตัดครั้งถัดไป หลังตัดไม่ผ่านไปแล้ว failedAttempts ครั้ง (null = หมดรอบลองใหม่) */
export function nextRetryOn(dueOn: string, failedAttempts: number): string | null {
  const after = RETRY_AFTER_DAYS[failedAttempts - 1];
  return after === undefined ? null : addDays(dueOn, after);
}

export function declineReason(last4: string): string | null {
  return TEST_CARDS.find(c => c.last4 === last4)?.declineReason ?? null;
}

/** รายได้ต่อเดือนของแพ็กเกจ (ใช้คิด MRR) */
export function monthlyValueSatang(pkg: { priceSatang: number; months?: number }): number {
  return Math.round(pkg.priceSatang / (pkg.months ?? 1));
}
