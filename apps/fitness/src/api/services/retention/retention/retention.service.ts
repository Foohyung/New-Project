/** คะแนนความเสี่ยงที่สมาชิกจะไม่ต่ออายุ (pure) */

export interface RiskInput {
  daysSinceLastVisit: number | null;
  /** จำนวนครั้งที่เข้ายิมใน 4 สัปดาห์ล่าสุด และ 4 สัปดาห์ก่อนหน้า */
  recentVisits: number;
  previousVisits: number;
  /** ติดลบ = หมดอายุมาแล้ว */
  daysLeft: number;
  paymentFailed: boolean;
  ignoredReminders: number;
}

export type RiskLevel = 'high' | 'medium' | 'low';
export type RiskReason = 'absent' | 'drop' | 'expiring' | 'lapsed' | 'payment' | 'ignored';

export const RISK_WEIGHTS = { absent: 40, drop: 25, expiring: 20, payment: 15, ignored: 10 } as const;

export function riskScore(input: RiskInput): { score: number; level: RiskLevel; reasons: { key: RiskReason; label: string }[] } {
  const reasons: { key: RiskReason; label: string; points: number }[] = [];
  const away = input.daysSinceLastVisit;
  if (away === null || away >= 14) reasons.push({ key: 'absent', label: away === null ? 'ยังไม่เคยมา' : `ไม่มา ${String(away)} วัน`, points: RISK_WEIGHTS.absent });
  else if (away >= 7) reasons.push({ key: 'absent', label: `ไม่มา ${String(away)} วัน`, points: Math.round(RISK_WEIGHTS.absent * 0.6) });

  if (input.previousVisits >= 4) {
    const drop = 1 - input.recentVisits / input.previousVisits;
    if (drop >= 0.3) reasons.push({ key: 'drop', label: `ความถี่ลด ${String(Math.round(drop * 100))}%`, points: drop >= 0.5 ? RISK_WEIGHTS.drop : Math.round(RISK_WEIGHTS.drop * 0.6) });
  }

  if (input.daysLeft >= 0 && input.daysLeft <= 7) reasons.push({ key: 'expiring', label: `หมดอายุใน ${String(input.daysLeft)} วัน`, points: RISK_WEIGHTS.expiring });
  else if (input.daysLeft < 0 && input.daysLeft >= -30) reasons.push({ key: 'lapsed', label: `หมดอายุมา ${String(-input.daysLeft)} วัน`, points: RISK_WEIGHTS.expiring });

  if (input.paymentFailed) reasons.push({ key: 'payment', label: 'ตัดบัตรไม่ผ่าน', points: RISK_WEIGHTS.payment });
  if (input.ignoredReminders > 0) reasons.push({ key: 'ignored', label: 'ไม่เปิดข้อความเตือน', points: RISK_WEIGHTS.ignored });

  const score = Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0));
  const level: RiskLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, level, reasons: reasons.map(({ key, label }) => ({ key, label })) };
}

export const RISK_LABEL: Record<RiskLevel, string> = { high: 'เสี่ยงสูง', medium: 'เสี่ยงปานกลาง', low: 'ปกติ' };

export type FollowUpStage = 'todo' | 'contacted' | 'won';
export const STAGE_LABEL: Record<FollowUpStage, string> = { todo: 'ต้องติดต่อ', contacted: 'ติดต่อแล้ว', won: 'กลับมาแล้ว' };
