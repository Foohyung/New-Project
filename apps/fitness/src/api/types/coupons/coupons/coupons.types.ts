import type { CouponKind } from '@/api/services/coupons/coupons/coupons.service';

export interface CouponDto {
  code: string;
  description: string;
  kind: CouponKind;
  label: string;
  used: number;
  limit: number | null;
  expiresOn: string | null;
  state: 'active' | 'exhausted' | 'expired' | 'off';
  revenueSatang: number;
  ownerName: string | null;
  renewOnly: boolean;
  newOnly: boolean;
  packageIds: string[] | null;
}
