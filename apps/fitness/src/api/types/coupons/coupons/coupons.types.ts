import type { CouponKind, CouponTarget } from '@/api/services/coupons/coupons/coupons.service';

export interface CouponDto {
  code: string;
  description: string;
  kind: CouponKind;
  label: string;
  used: number;
  limit: number | null;
  type: 'percent' | 'baht' | 'days';
  value: number;
  startsOn: string;
  expiresOn: string | null;
  state: 'active' | 'scheduled' | 'exhausted' | 'expired' | 'off';
  revenueSatang: number;
  ownerName: string | null;
  renewOnly: boolean;
  newOnly: boolean;
  packageIds: string[] | null;
  appliesTo: CouponTarget[];
  perMember: number;
  terms: string | null;
  minMemberDays: number | null;
  proofRequired: string | null;
  /** เงื่อนไขแบบสั้นสำหรับแสดงในตาราง */
  conditions: string[];
}
