'use client';

import { formatBaht } from '@repo/utils';
import { Building2, ChevronDown, GraduationCap, Hospital, MapPin, Share2, ShoppingBag, TrainFront } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { DEFAULT_TERMS, mortgageSummary } from '@/features/mortgage/service';
import { FavoriteButton } from './favorites';

export function DetailTools({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = location.href.split('#')[0] ?? location.href;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => { setCopied(false); }, 2000); }
    } catch {
      // ผู้ใช้ยกเลิกการแชร์ — ไม่ต้องทำอะไร
    }
  };
  return (
    <div className="ml-auto flex items-center">
      <button type="button" onClick={() => { void share(); }} aria-label="แชร์ประกาศ" className="grid size-11 place-items-center">
        <span className="grid size-9 place-items-center rounded-xl border border-line bg-surface"><Share2 aria-hidden className="size-[18px]" /></span>
      </button>
      <FavoriteButton slug={slug} title={title} className="[&>span]:size-9 [&>span]:rounded-xl [&>span]:border [&>span]:border-line [&>span]:shadow-none" />
      <span role="status" className="sr-only">{copied ? 'คัดลอกลิงก์แล้ว' : ''}</span>
      {copied && <span aria-hidden className="ml-1 text-sm text-go">คัดลอกลิงก์แล้ว</span>}
    </div>
  );
}

/** ข้อความยาว: แสดง 4 บรรทัดแรก กด "แสดงรายละเอียดเพิ่มเติม" เพื่อกาง */
export function ExpandText({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div id={id} className={`max-w-[72ch] whitespace-pre-line ${open ? '' : 'max-h-[7.2em] overflow-hidden [mask-image:linear-gradient(180deg,#000_60%,transparent)]'}`}>{children}</div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(v => !v); }} className="inline-flex min-h-11 items-center gap-1 font-medium text-accent">
        {open ? 'ย่อรายละเอียด' : 'แสดงรายละเอียดเพิ่มเติม'}<ChevronDown aria-hidden className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </>
  );
}

const NEAR_ICON = { mall: ShoppingBag, transit: TrainFront, hospital: Hospital, school: GraduationCap, other: Building2 } as const;
export type NearKind = keyof typeof NEAR_ICON;
const TABS: { id: NearKind | 'all'; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' }, { id: 'mall', label: 'ห้างสรรพสินค้า' }, { id: 'transit', label: 'รถไฟฟ้า' }, { id: 'hospital', label: 'โรงพยาบาล' }, { id: 'school', label: 'มหาวิทยาลัย / โรงเรียน' },
];

export function NearbyPlaces({ places }: { places: { kind: NearKind; name: string; distance: string }[] }) {
  const [tab, setTab] = useState<NearKind | 'all'>('all');
  const shown = tab === 'all' ? places : places.filter(p => p.kind === tab);
  return (
    <>
      <div role="group" aria-label="ประเภทสถานที่" className="scrollbar-none mt-3 mb-2 flex gap-2 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => { setTab(t.id); }} className="min-h-11 shrink-0 rounded-full border border-line px-3.5 text-sm font-medium aria-pressed:border-go aria-pressed:bg-go aria-pressed:text-white">{t.label}</button>
        ))}
      </div>
      <ul aria-live="polite">
        {shown.length === 0 && <li className="flex min-h-10 items-center gap-2.5 text-muted"><MapPin aria-hidden className="size-[18px]" />ยังไม่มีข้อมูลในหมวดนี้</li>}
        {shown.map(p => {
          const Icon = NEAR_ICON[p.kind];
          return <li key={p.name} className="flex min-h-10 items-center gap-2.5 border-b border-line"><Icon aria-hidden className="size-[18px] text-muted" />{p.name}<span className="ml-auto text-sm text-muted">{p.distance}</span></li>;
        })}
      </ul>
    </>
  );
}

/** คำนวณค่างวดแบบย่อ — สูตรเดียวกับฝั่ง server (features/mortgage/service) */
export function LoanEstimate({ price }: { price: number }) {
  const [downPct, setDownPct] = useState<number>(DEFAULT_TERMS.downPct);
  const [years, setYears] = useState<number>(DEFAULT_TERMS.years);
  const s = mortgageSummary({ price, downPct, years, ratePct: DEFAULT_TERMS.ratePct });
  const downId = useId(), yearId = useId();
  return (
    <div className="grid max-w-[560px] gap-3">
      <div>
        <label htmlFor={downId} className="flex justify-between text-sm font-medium">เงินดาวน์ <output htmlFor={downId} className="font-semibold text-accent">{downPct}% · {formatBaht(Math.round((price * downPct) / 100))}</output></label>
        <input id={downId} type="range" min={0} max={50} step={5} value={downPct} onChange={e => { setDownPct(Number(e.target.value)); }} className="h-11 w-full accent-accent" />
      </div>
      <div>
        <label htmlFor={yearId} className="flex justify-between text-sm font-medium">ระยะเวลาผ่อน <output htmlFor={yearId} className="font-semibold text-accent">{years} ปี</output></label>
        <input id={yearId} type="range" min={5} max={40} step={5} value={years} onChange={e => { setYears(Number(e.target.value)); }} className="h-11 w-full accent-accent" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-navy px-4 py-3.5 text-white" aria-live="polite">
        <span>ผ่อนประมาณ (ดอกเบี้ย {DEFAULT_TERMS.ratePct}%)</span>
        <b className="text-2xl text-cta">{formatBaht(s.monthly)}/เดือน</b>
      </div>
      <p className="text-[13px] text-muted">วงเงินกู้ {formatBaht(s.loan)} · รายได้ที่ควรมี {formatBaht(s.suggestedIncome)}/เดือน — ตัวเลขประมาณการ ไม่ใช่ข้อเสนอสินเชื่อ</p>
    </div>
  );
}
