// เนื้อหาและกติกาของหน้าแรกก่อนเข้าสู่ระบบ (หน้า /) — logic ล้วน ไม่แตะฐานข้อมูล

/** ลิงก์ปุ่ม "ทักแชทสอบถาม" จาก env `LANDING_CHAT_URL` — รับเฉพาะ https เท่านั้น ไม่ตั้ง/ไม่ถูกต้อง = ซ่อนปุ่มแชท */
export function chatUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export type BillingCycle = 'month' | 'year';

/** ราคาแบบเช่าใช้ (จากไฟล์โปรโมท) */
export const RENT_PRICE: Record<BillingCycle, { amount: number; unit: string; note: string }> = {
  month: { amount: 990, unit: '/ เดือน', note: 'ยกเลิกได้เมื่อครบ 3 เดือน' },
  year: { amount: 9900, unit: '/ ปี', note: 'เฉลี่ย ฿825 ต่อเดือน · ประหยัด ฿1,980' },
};

export const BUYOUT_PRICE = { amount: 59000, unit: 'ครั้งเดียว', note: 'ดูแลรายปี ฿9,900 (ไม่บังคับ)' } as const;

/** แสดงราคาโฆษณาโดยไม่มีสตางค์ */
export const formatPrice = (amount: number): string => `฿${amount.toLocaleString('en-US')}`;

/** สมาชิกตัวอย่างในการ์ดเช็กอินสด (คนที่ ok: false = แพ็กเกจหมดอายุ ระบบปฏิเสธ) */
export const DEMO_CHECKINS = [
  { name: 'คุณปิยะ', id: 'FF-0101', pkg: 'รายเดือน · เหลือ 30 วัน', time: '18:42', ok: true },
  { name: 'คุณมายด์', id: 'FF-0214', pkg: '10 ครั้ง · เหลือ 4 ครั้ง', time: '18:44', ok: true },
  { name: 'คุณต้น', id: 'FF-0088', pkg: 'หมดอายุเมื่อวาน', time: '18:45', ok: false },
  { name: 'คุณแนน', id: 'FF-0342', pkg: 'รายปี · เหลือ 211 วัน', time: '18:47', ok: true },
] as const;

export type StepState = 'done' | 'active' | 'wait' | 'denied';

/**
 * สถานะ 3 ขั้นของการ์ดเช็กอินสด (สแกน → ตรวจแพ็กเกจ → บันทึกเข้าใช้) เมื่ออยู่ที่ขั้น `step` (0–3, 3 = จบ)
 * คนที่หมดอายุ: ตั้งแต่ตรวจแพ็กเกจเสร็จ ขั้น 2–3 เป็น "denied"
 */
export function checkInSteps(step: number, ok: boolean): StepState[] {
  return [0, 1, 2].map(i => {
    if (!ok && i >= 1 && step > 1) return 'denied';
    return i < step ? 'done' : i === step ? 'active' : 'wait';
  });
}
