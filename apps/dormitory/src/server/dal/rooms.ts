import 'server-only';
import { daysBetween, formatThaiMobile } from '@repo/utils';
import { collectionRate, computeInvoice, unitsUsed } from '@/features/billing/service';
import type { InvoiceDto, RoomDetailDto, RoomDto, RoomStatus } from '@/features/rooms/types';
import { canReadRoom, type Session } from '../auth';
import { today } from '../clock';
import { BILLING_MONTH, DUE_ON, RATES, rooms, todos, type RoomRecord } from '../seed';

function invoiceOf(room: RoomRecord) {
  if (!room.electric || !room.water) return null;
  return computeInvoice({ rent: room.rent, rates: RATES, electric: room.electric, water: room.water });
}

function toDto(room: RoomRecord): RoomDto {
  return {
    no: room.no,
    floor: room.floor,
    status: room.status,
    tenantNickname: room.tenant?.nickname ?? null,
    rent: room.rent,
    total: invoiceOf(room)?.total ?? null,
    hasRepairTicket: room.repairTicket !== null,
  };
}

/** เบอร์โทรแบบ mask เป็นค่าเริ่มต้น (§10.9) เช่น 080-000-0304 → 080-XXX-0304 */
function maskPhone(phone: string): string {
  const formatted = formatThaiMobile(phone);
  return formatted.replace(/^(\d{3})-\d{3}-/, '$1-XXX-');
}

/** พนักงานเท่านั้น — คืน Promise ที่ reject เพื่อให้ผู้เรียกจัดการด้วย await ได้เสมอ */
function authorizeStaff(session: Session): Promise<void> {
  return session.role === 'tenant' ? Promise.reject(new Error('FORBIDDEN')) : Promise.resolve();
}

export async function listRooms(session: Session, floor?: number): Promise<RoomDto[]> {
  await authorizeStaff(session);
  return rooms.filter(r => floor === undefined || r.floor === floor).map(toDto);
}

export function getRoom(session: Session, no: number): Promise<RoomDetailDto | null> {
  const room = rooms.find(r => r.no === no);
  // ไม่แยกระหว่าง "ไม่มี" กับ "ไม่มีสิทธิ์" เพื่อไม่ให้เดาข้อมูลได้ (§6.1)
  if (!room || !canReadRoom(session, no)) return Promise.resolve(null);
  const invoice = invoiceOf(room);
  return Promise.resolve({
    ...toDto(room),
    tenantName: room.tenant?.name ?? null,
    tenantPhoneMasked: room.tenant ? maskPhone(room.tenant.phone) : null,
    moveInOn: room.tenant?.moveInOn ?? null,
    invoiceNo: invoice ? `INV-6910-${String(room.no).padStart(4, '0')}` : null,
    lines: invoice?.lines ?? [],
    electric: room.electric ? { ...room.electric, units: unitsUsed(room.electric) } : null,
    water: room.water ? { ...room.water, units: unitsUsed(room.water) } : null,
    dueOn: DUE_ON,
    overdueDays: room.status === 'overdue' ? daysBetween(DUE_ON, today()) : 0,
    paidAt: room.paidAt,
    repairNote: room.repairTicket ?? room.repairNote,
  });
}

export interface Summary {
  billingMonth: string;
  billed: number;
  collected: number;
  rate: number;
  remainingRooms: number;
  overdue: { count: number; amount: number };
  slip: { count: number; amount: number };
  vacant: number;
  repair: number;
  occupied: number;
  totalRooms: number;
  avgElectricUnits: number;
  openRepairs: number;
}

export async function getSummary(session: Session): Promise<Summary> {
  await authorizeStaff(session);
  const billedRooms = rooms.map(r => ({ room: r, invoice: invoiceOf(r) })).filter(x => x.invoice !== null);
  const sumWhere = (status: RoomStatus) => billedRooms.filter(x => x.room.status === status).reduce((s, x) => s + (x.invoice?.total ?? 0), 0);
  const countWhere = (status: RoomStatus) => rooms.filter(r => r.status === status).length;
  const billed = billedRooms.reduce((s, x) => s + (x.invoice?.total ?? 0), 0);
  const collected = sumWhere('paid');
  const units = billedRooms.map(x => x.invoice?.electricUnits ?? 0);
  return {
    billingMonth: BILLING_MONTH,
    billed,
    collected,
    rate: collectionRate(collected, billed),
    remainingRooms: countWhere('overdue') + countWhere('slip'),
    overdue: { count: countWhere('overdue'), amount: sumWhere('overdue') },
    slip: { count: countWhere('slip'), amount: sumWhere('slip') },
    vacant: countWhere('vacant'),
    repair: countWhere('repair'),
    occupied: billedRooms.length,
    totalRooms: rooms.length,
    avgElectricUnits: Math.round(units.reduce((a, b) => a + b, 0) / Math.max(1, units.length)),
    openRepairs: rooms.filter(r => r.repairTicket).length + 2,
  };
}

export async function listInvoices(session: Session, status?: InvoiceDto['status']): Promise<InvoiceDto[]> {
  await authorizeStaff(session);
  const result = rooms
    .flatMap((r): InvoiceDto[] => {
      const invoice = invoiceOf(r);
      if (!invoice || !r.tenant || (r.status !== 'paid' && r.status !== 'slip' && r.status !== 'overdue')) return [];
      return [{ invoiceNo: `INV-6910-${String(r.no).padStart(4, '0')}`, roomNo: r.no, tenantNickname: r.tenant.nickname, total: invoice.total, status: r.status, paidAt: r.paidAt }];
    })
    .filter(i => !status || i.status === status);
  const order = { overdue: 0, slip: 1, paid: 2 } as const;
  return result.sort((a, b) => order[a.status] - order[b.status] || a.roomNo - b.roomNo);
}

export async function recentPayments(session: Session, limit = 4): Promise<InvoiceDto[]> {
  const paid = await listInvoices(session, 'paid');
  return paid.sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '')).slice(0, limit);
}

export async function listTodos(session: Session): Promise<typeof todos> {
  await authorizeStaff(session);
  return todos;
}
