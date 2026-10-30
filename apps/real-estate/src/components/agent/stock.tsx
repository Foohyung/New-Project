import { formatBaht, formatThaiDate } from '@repo/utils';
import Link from 'next/link';
import { commissionLabel } from '@/features/stock/service';
import { PROPERTY_TYPE_LABEL, UNIT_STATUS_LABEL, type UnitRow, type UnitStatus } from '@/features/stock/types';
import { Badge } from './ui';

export const STATUS_TONE = { available: 'ok', reserved: 'warn', negotiating: 'accent', rented: 'violet', sold: 'mute' } as const;

export function StatusBadge({ status }: { status: UnitStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{UNIT_STATUS_LABEL[status]}</Badge>;
}

export function priceText(u: Pick<UnitRow, 'salePrice' | 'rentPrice'>): string {
  return [u.salePrice !== null ? `ขาย ${formatBaht(u.salePrice)}` : '', u.rentPrice !== null ? `เช่า ${formatBaht(u.rentPrice)}/ด.` : ''].filter(Boolean).join(' · ');
}

export const sizeText = (u: UnitRow) => [u.bedrooms ? `${String(u.bedrooms)} นอน` : u.property.type === 'condo' ? 'สตูดิโอ' : '', `${String(u.areaSqm)} ตร.ม.`, u.landSqWah ? `${String(u.landSqWah)} ตร.ว.` : ''].filter(Boolean).join(' · ');

export function UnitCard({ u, compact = false }: { u: UnitRow; compact?: boolean }) {
  return (
    <Link href={`/agent/stock/${u.property.code}`} className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
      <span className="flex items-start justify-between gap-2">
        <b className="min-w-0 leading-snug">{u.property.name} <span className="font-medium text-muted">· {u.label}</span></b>
        {!compact && <StatusBadge status={u.status} />}
      </span>
      <span className="text-sm text-muted">{u.property.code} · {PROPERTY_TYPE_LABEL[u.property.type]} · {sizeText(u)}</span>
      <span className="font-semibold tabular-nums">{priceText(u)}</span>
      {!compact && <span className="text-sm text-muted">เจ้าของ {u.owner.name} · คอม {commissionLabel(u.commission)}{u.exclusive ? ' · Exclusive' : ''}</span>}
      {u.leaseEnd && <span className="text-xs text-muted">เช่าถึง {formatThaiDate(u.leaseEnd)}</span>}
    </Link>
  );
}

