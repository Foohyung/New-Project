import type { PaymentMethod, PaymentStatus } from './service';

export interface PaymentDto {
  id: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  packageName: string;
  kind: 'signup' | 'renew' | 'pt' | 'daypass';
  amountSatang: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

export const KIND_LABEL: Record<PaymentDto['kind'], string> = {
  signup: 'สมัครสมาชิก',
  renew: 'ต่ออายุ',
  pt: 'แพ็กเกจ PT',
  daypass: 'Day pass',
};
