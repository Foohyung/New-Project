import type { SavedCard } from '@/api/services/subscriptions/subscriptions/subscriptions.service';

export interface SubscriptionOverviewDto {
  subscribers: number;
  sharePct: number;
  mrrSatang: number;
  mrrTrend: { month: string; satang: number }[];
  failing: number;
  upcoming: { memberId: string; name: string; packageName: string; amountSatang: number; dueOn: string; card: string }[];
  problems: { chargeId: string; memberId: string; name: string; amountSatang: number; reason: string; attempts: { on: string; ok: boolean }[]; nextRetryOn: string | null; status: 'retrying' | 'failed' }[];
  recent: { memberId: string; name: string; amountSatang: number; on: string; paymentId: string | null }[];
}

export interface MyAutoRenewDto {
  eligible: boolean;
  enabled: boolean;
  card: SavedCard | null;
  packageName: string;
  amountSatang: number;
  nextChargeOn: string | null;
}
