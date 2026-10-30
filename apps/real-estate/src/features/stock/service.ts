import { formatBaht } from '@repo/utils';
import { PROPERTY_TYPES, UNIT_STATUSES, type Commission, type PropertyType, type UnitRow, type UnitStatus } from './types';

/** ค่าคอมที่คาดว่าจะได้จากยูนิต (สตางค์) — ใช้ราคาขายถ้าเป็นดีลขาย และค่าเช่าถ้าเป็นดีลเช่า */
export function expectedCommission(commission: Commission, deal: { kind: 'sale' | 'rent'; price: number }): number {
  if (commission.kind === 'fixed') return commission.satang;
  if (commission.kind === 'months') return deal.kind === 'rent' ? deal.price * commission.months : 0;
  return Math.round((deal.price * commission.basisPoints) / 10_000);
}

export function commissionLabel(commission: Commission): string {
  if (commission.kind === 'fixed') return `เหมา ${formatBaht(commission.satang)}`;
  if (commission.kind === 'months') return `ค่าเช่า ${String(commission.months)} เดือน`;
  const pct = commission.basisPoints / 100;
  return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(2)}% ของราคาขาย`;
}

export interface StockFilter {
  status?: UnitStatus;
  type?: PropertyType;
  q?: string;
}

const isStatus = (v: unknown): v is UnitStatus => typeof v === 'string' && (UNIT_STATUSES as readonly string[]).includes(v);
const isType = (v: unknown): v is PropertyType => typeof v === 'string' && (PROPERTY_TYPES as readonly string[]).includes(v);

/** อ่านตัวกรองจาก query string — ค่าที่ไม่รู้จักถูกตัดทิ้ง */
export function parseStockFilter(input: { status?: unknown; type?: unknown; q?: unknown }): StockFilter {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 60) : '';
  return { status: isStatus(input.status) ? input.status : undefined, type: isType(input.type) ? input.type : undefined, q: q || undefined };
}

export function filterUnits(rows: readonly UnitRow[], filter: StockFilter): UnitRow[] {
  const q = filter.q?.toLowerCase();
  return rows.filter(r =>
    (!filter.status || r.status === filter.status) &&
    (!filter.type || r.property.type === filter.type) &&
    (!q || [r.property.name, r.property.code, r.label, r.property.location, r.owner.name].some(s => s.toLowerCase().includes(q))),
  );
}

export function countByStatus(rows: readonly UnitRow[]): Record<UnitStatus, number> {
  const out = Object.fromEntries(UNIT_STATUSES.map(s => [s, 0])) as Record<UnitStatus, number>;
  for (const r of rows) out[r.status] += 1;
  return out;
}

/** สัญญาเช่าที่จะหมดภายใน `days` วัน (เรียงใกล้หมดก่อน) */
export function leasesEndingSoon(rows: readonly UnitRow[], today: string, days: number, daysBetween: (a: string, b: string) => number): UnitRow[] {
  return rows
    .filter(r => r.leaseEnd && daysBetween(today, r.leaseEnd) >= 0 && daysBetween(today, r.leaseEnd) <= days)
    .sort((a, b) => (a.leaseEnd ?? '').localeCompare(b.leaseEnd ?? ''));
}

/** ซ่อนเลขบัตร/ทะเบียนเหลือ 4 ตัวท้าย (Confidential §11) */
export function maskId(id: string): string {
  const digits = id.replace(/\D/g, '');
  if (digits.length < 5) return '••••';
  return `•••••••••${digits.slice(-4)}`;
}

/** รหัสทรัพย์ถัดไป เช่น BH-105 → BH-106 */
export function nextPropertyCode(codes: readonly string[]): string {
  const max = codes.reduce((m, c) => Math.max(m, Number(/^BH-(\d+)$/.exec(c)?.[1] ?? 0)), 100);
  return `BH-${String(max + 1)}`;
}
