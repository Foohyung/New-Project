import { describe, expect, it } from 'vitest';
import { riskScore, type RiskInput } from './service';

const healthy: RiskInput = { daysSinceLastVisit: 1, recentVisits: 12, previousVisits: 12, daysLeft: 60, paymentFailed: false, ignoredReminders: 0 };

describe('riskScore', () => {
  it('สมาชิกที่มาสม่ำเสมอ = ปกติ', () => {
    expect(riskScore(healthy)).toMatchObject({ score: 0, level: 'low', reasons: [] });
  });
  it('หายไปนาน + ความถี่ลด + ใกล้หมดอายุ = เสี่ยงสูง', () => {
    const r = riskScore({ ...healthy, daysSinceLastVisit: 18, recentVisits: 3, previousVisits: 12, daysLeft: 4 });
    expect(r.score).toBe(85);
    expect(r.level).toBe('high');
    expect(r.reasons.map(x => x.label)).toEqual(['ไม่มา 18 วัน', 'ความถี่ลด 75%', 'หมดอายุใน 4 วัน']);
  });
  it('คะแนนไม่เกิน 100', () => {
    expect(riskScore({ daysSinceLastVisit: null, recentVisits: 0, previousVisits: 10, daysLeft: 2, paymentFailed: true, ignoredReminders: 2 }).score).toBe(100);
  });
  it('หายไป 7–13 วันได้คะแนนบางส่วน และฐานเดิมน้อยไม่คิดความถี่ลด', () => {
    const r = riskScore({ ...healthy, daysSinceLastVisit: 9, recentVisits: 0, previousVisits: 2 });
    expect(r.score).toBe(24);
    expect(r.level).toBe('low');
  });
  it('ตัดบัตรไม่ผ่าน + หมดอายุไม่นาน = ปานกลาง', () => {
    expect(riskScore({ ...healthy, daysLeft: -6, paymentFailed: true })).toMatchObject({ score: 35, level: 'low' });
    expect(riskScore({ ...healthy, daysLeft: -6, paymentFailed: true, ignoredReminders: 1 }).level).toBe('medium');
  });
});
