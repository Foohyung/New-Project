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
  /** ระยะเวลาของแพ็กเกจ เช่น "1 เดือน" "10 ครั้ง" */
  packageDuration: string;
  coverage: { from: string; to: string } | null;
  receivedBy: string | null;
}

export const KIND_LABEL: Record<PaymentDto['kind'], string> = {
  signup: 'สมัครสมาชิก',
  renew: 'ต่ออายุ',
  pt: 'แพ็กเกจ PT',
  daypass: 'Day pass',
};

/** ข้อมูลผู้ขายที่ต้องพิมพ์บนใบเสร็จ/ใบกำกับภาษีอย่างย่อ */
export interface ShopProfile {
  brand: string;
  legalName: string;
  branch: string;
  address: string;
  taxId: string;
  phone: string;
  promptPayId: string;
}
