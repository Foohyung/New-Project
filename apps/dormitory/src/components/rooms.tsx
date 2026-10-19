import { formatBaht } from '@repo/utils';
import { Wrench } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROOM_STATUS_LABEL, type RoomDto, type RoomStatus } from '@/features/rooms/types';

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[22px] bg-surface p-5 ${className}`}>
      {title && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TILE: Record<RoomStatus, { box: string; pill: string }> = {
  paid: { box: 'bg-mint', pill: 'bg-surface text-green' },
  slip: { box: 'bg-sun-soft', pill: 'bg-sun text-[#5c3d00]' },
  overdue: { box: 'bg-coral-soft ring-2 ring-[#f6b3a8]', pill: 'bg-coral text-white' },
  vacant: { box: 'bg-surface ring-2 ring-dashed ring-[#bfd8cb]', pill: 'bg-mint text-green' },
  repair: { box: 'bg-[repeating-linear-gradient(135deg,var(--color-lilac-soft)_0_10px,#f6f3ff_10px_20px)]', pill: 'bg-lilac text-white' },
};

const PILL_TEXT: Record<RoomStatus, string> = { paid: 'จ่ายแล้ว', slip: 'รอตรวจสลิป', overdue: 'ค้างชำระ', vacant: 'หาผู้เช่า', repair: 'ปรับปรุง' };

export function RoomTile({ room }: { room: RoomDto }) {
  const style = TILE[room.status];
  return (
    <Link
      href={`/rooms/${room.no}`}
      aria-label={`ห้อง ${room.no} ${ROOM_STATUS_LABEL[room.status]}${room.hasRepairTicket ? ' มีงานแจ้งซ่อม' : ''}`}
      className={`relative flex min-h-[112px] flex-col rounded-[18px] p-3.5 transition-transform hover:-translate-y-0.5 ${style.box}`}
    >
      {room.hasRepairTicket && (
        <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-surface text-coral"><Wrench aria-hidden className="size-3.5" /></span>
      )}
      <span className="font-display text-[22px] leading-tight font-medium">{room.no}</span>
      <span className="text-sm text-muted">{room.tenantNickname ? `คุณ${room.tenantNickname}` : room.status === 'vacant' ? `ว่าง · ${formatBaht(room.rent)}/เดือน` : 'ปิดปรับปรุง'}</span>
      <span className="mt-auto flex items-center justify-between gap-1.5 pt-2">
        <span className="text-sm font-semibold">{room.total !== null ? formatBaht(room.total) : ''}</span>
        <span className={`rounded-full px-2.5 text-xs leading-6 font-semibold whitespace-nowrap ${style.pill}`}>{PILL_TEXT[room.status]}</span>
      </span>
    </Link>
  );
}

export function RoomLegend() {
  const items: [RoomStatus, string][] = [['paid', 'bg-mint'], ['slip', 'bg-sun'], ['overdue', 'bg-coral'], ['vacant', 'bg-surface ring-2 ring-dashed ring-[#bfd8cb]'], ['repair', 'bg-lilac']];
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {items.map(([status, color]) => (
        <li key={status} className="inline-flex items-center gap-1.5"><i aria-hidden className={`size-3 rounded ${color}`} />{ROOM_STATUS_LABEL[status]}</li>
      ))}
    </ul>
  );
}

export function FloorTabs({ current, basePath }: { current: number; basePath: string }) {
  return (
    <nav aria-label="เลือกชั้น" className="flex gap-1.5 rounded-full bg-bg p-1">
      {[1, 2, 3, 4].map(floor => (
        <Link
          key={floor}
          href={`${basePath}?floor=${floor}`}
          scroll={false}
          aria-current={floor === current ? 'page' : undefined}
          className="inline-flex min-h-11 items-center rounded-full px-4 font-medium whitespace-nowrap text-muted aria-[current=page]:bg-green aria-[current=page]:text-white"
        >
          ชั้น {floor}
        </Link>
      ))}
    </nav>
  );
}

export const STATUS_BADGE: Record<RoomStatus, string> = {
  paid: 'bg-mint text-green-deep',
  slip: 'bg-sun-soft text-[#7a5200]',
  overdue: 'bg-coral-soft text-coral',
  vacant: 'bg-bg text-muted',
  repair: 'bg-lilac-soft text-lilac',
};
