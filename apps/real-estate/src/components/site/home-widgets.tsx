'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { TRANSIT_LINES } from '@/features/homes/catalog';
import { searchHref } from '@/features/homes/service';

/** แถวเลื่อนแนวนอน + ปุ่มลูกศร (จอ ≥ md) — ซ่อน scrollbar แต่ยังปัด/เลื่อนด้วยคีย์บอร์ดได้ (§15.8) */
export function Scroller({ title, action, children, label }: { title: ReactNode; action?: ReactNode; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => { const el = ref.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        {title}
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden gap-2 md:flex">
            <button type="button" aria-label={`เลื่อน${label}ไปทางซ้าย`} onClick={() => { go(-1); }} className="grid size-11 place-items-center rounded-full border border-line bg-surface shadow-sm hover:border-accent"><ChevronLeft aria-hidden className="size-5" /></button>
            <button type="button" aria-label={`เลื่อน${label}ไปทางขวา`} onClick={() => { go(1); }} className="grid size-11 place-items-center rounded-full border border-line bg-surface shadow-sm hover:border-accent"><ChevronRight aria-hidden className="size-5" /></button>
          </div>
        </div>
      </div>
      <div ref={ref} tabIndex={0} aria-label={label} className="scrollbar-none -mx-4 flex snap-x gap-3.5 overflow-x-auto scroll-smooth px-4 pt-1 pb-2 md:mx-0 md:px-0">
        {children}
      </div>
    </>
  );
}

/** เลือกสายรถไฟฟ้า แล้วแตะสถานีเพื่อไปหน้าค้นหารอบสถานี */
export function TransitPicker() {
  const [lineIdx, setLineIdx] = useState(0);
  const line = TRANSIT_LINES[lineIdx] ?? TRANSIT_LINES[0];
  if (!line) return null;
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3.5">
      <div role="group" aria-label="เลือกสายรถไฟฟ้า" className="scrollbar-none flex gap-2 overflow-x-auto">
        {TRANSIT_LINES.map((l, i) => (
          <button key={l.id} type="button" aria-pressed={i === lineIdx} onClick={() => { setLineIdx(i); }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-3.5 pl-2.5 text-sm font-semibold whitespace-nowrap aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white">
            <span aria-hidden className="size-3.5 rounded-full" style={{ background: l.color }} />{l.label}
          </button>
        ))}
      </div>
      <ol aria-label={`สถานีของ${line.label}`} tabIndex={0} className="scrollbar-none flex overflow-x-auto px-0.5 pt-1.5">
        {line.stations.map((s, i) => (
          <li key={s.name} className="relative min-w-[104px] shrink-0">
            <span aria-hidden className="absolute top-[13px] h-1.5" style={{ background: line.color, left: i === 0 ? '50%' : 0, right: i === line.stations.length - 1 ? '50%' : 0 }} />
            <Link href={searchHref({ q: s.name, transit: '1' })} className="group relative flex min-h-[76px] flex-col items-center gap-1.5 px-1.5 text-center text-sm">
              <span aria-hidden className="size-[30px] rounded-full border-[5px] bg-white group-hover:bg-cta" style={{ borderColor: line.color }} />
              <span className="group-hover:text-accent group-hover:underline">{s.name}</span>
              <small className="text-xs text-muted">{s.count} ประกาศ</small>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
