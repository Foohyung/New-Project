import type { ReminderRound } from './service';

export interface ReminderCenterDto {
  rounds: (ReminderRound & { title: string; hint: string; preview: string })[];
  stats: { sent: number; byChannel: string; clickRate: number; paidCount: number; revenueSatang: number };
  due: { memberId: string; name: string; roundTitle: string; expiresOn: string; channels: string }[];
  logs: { id: string; memberId: string; name: string; roundTitle: string; channels: string; sentAt: string; outcome: 'sent' | 'clicked' | 'pending' | 'paid' }[];
  excludedNoConsent: number;
}
