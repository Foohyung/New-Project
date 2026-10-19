/** ค่าผ่อนรายเดือนแบบลดต้นลดดอก (หน่วยสตางค์) — ใช้ทั้งฝั่ง server และเครื่องคำนวณในหน้าเว็บ */
export function monthlyPayment(input: { price: number; downPct: number; years: number; ratePct: number }): number {
  const { price, downPct, years, ratePct } = input;
  if (!Number.isSafeInteger(price) || price < 0) throw new RangeError('ราคาต้องเป็นสตางค์แบบจำนวนเต็ม');
  if (downPct < 0 || downPct > 100 || years <= 0 || ratePct < 0) throw new RangeError('เงื่อนไขการผ่อนไม่ถูกต้อง');
  const loan = price * (1 - downPct / 100);
  const months = years * 12;
  const r = ratePct / 100 / 12;
  const payment = r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
  return Math.round(payment);
}

export interface MortgageSummary {
  loan: number;
  monthly: number;
  totalInterest: number;
  /** รายได้ต่อเดือนที่ควรมี (ผ่อนไม่เกิน 40% ของรายได้) */
  suggestedIncome: number;
}

export function mortgageSummary(input: { price: number; downPct: number; years: number; ratePct: number }): MortgageSummary {
  const loan = Math.round(input.price * (1 - input.downPct / 100));
  const monthly = monthlyPayment(input);
  return { loan, monthly, totalInterest: Math.max(0, monthly * input.years * 12 - loan), suggestedIncome: Math.round(monthly / 0.4) };
}

/** ค่าเริ่มต้นของเครื่องคำนวณ */
export const DEFAULT_TERMS = { downPct: 10, years: 30, ratePct: 3.5 } as const;
