import type { InvoiceLine } from '../billing/service';

export type RoomStatus = 'paid' | 'slip' | 'overdue' | 'vacant' | 'repair';

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  paid: 'ชำระแล้ว',
  slip: 'รอตรวจสลิป',
  overdue: 'ค้างชำระ',
  vacant: 'ว่าง',
  repair: 'ปิดปรับปรุง',
};

export interface RoomDto {
  no: number;
  floor: number;
  status: RoomStatus;
  tenantNickname: string | null;
  rent: number;
  total: number | null;
  hasRepairTicket: boolean;
}

export interface RoomDetailDto extends RoomDto {
  tenantName: string | null;
  tenantPhoneMasked: string | null;
  moveInOn: string | null;
  invoiceNo: string | null;
  lines: InvoiceLine[];
  electric: { previous: number; current: number; units: number } | null;
  water: { previous: number; current: number; units: number } | null;
  dueOn: string;
  overdueDays: number;
  paidAt: string | null;
  repairNote: string | null;
}

export interface InvoiceDto {
  invoiceNo: string;
  roomNo: number;
  tenantNickname: string;
  total: number;
  status: Extract<RoomStatus, 'paid' | 'slip' | 'overdue'>;
  paidAt: string | null;
}
