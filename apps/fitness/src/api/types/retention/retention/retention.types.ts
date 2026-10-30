import type { FollowUpStage, RiskLevel } from '@/api/services/retention/retention/retention.service';

export interface AtRiskDto {
  memberId: string;
  name: string;
  code: string;
  phone: string;
  packageName: string;
  daysLeft: number;
  score: number;
  level: RiskLevel;
  reasons: { key: string; label: string }[];
  /** เข้ายิมต่อสัปดาห์ เก่า → ใหม่ (8 สัปดาห์) */
  weekly: number[];
  stage: FollowUpStage | null;
  canMessage: boolean;
}

export interface RetentionDto {
  renewalRatePct: number;
  high: number;
  medium: number;
  recovered: number;
  recoveredSatang: number;
  atRisk: AtRiskDto[];
  board: Record<FollowUpStage, { memberId: string; name: string; note: string; by: string; updatedAt: string }[]>;
}
