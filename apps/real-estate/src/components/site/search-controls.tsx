'use client';

import { List, Map as MapIcon, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, type DropdownOption } from '@/components/agent/dropdown';
import { PRICE_RANGES, PROPERTY_TYPES, PROVINCES, SIZE_RANGES, SORTS } from '@/features/homes/catalog';
import { searchHref, type SearchQuery } from '@/features/homes/service';
import { MapArt } from '../property-art';
import { SuggestInput } from './search-box';

const opts = (all: string, list: readonly { id: string; label: string }[]): DropdownOption[] => [{ value: '', label: all }, ...list.map(x => ({ value: x.id, label: x.label }))];
const BEDS = opts('ห้องนอน', [0, 1, 2, 3, 4].map(n => ({ id: String(n), label: n === 0 ? 'สตูดิโอขึ้นไป' : `${String(n)} ห้องนอนขึ้นไป` })));
const BATHS = opts('ห้องน้ำ', [1, 2, 3].map(n => ({ id: String(n), label: `${String(n)} ห้องน้ำขึ้นไป` })));

type Query = Record<string, string | number | undefined>;

/** แถบค้นหา + ตัวกรองด่วน ของหน้า /search — ทุกตัวกรองอยู่ใน URL (§15.7) */
export function SearchControls({ query, filterCount, projects }: { query: SearchQuery; filterCount: number; projects: readonly { name: string; location: string }[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const deal = query.deal ?? 'sale';
  const q = query as Query;
  const go = (patch: Query) => { router.push(searchHref(q, patch)); };
  const str = (v: string | number | undefined) => (v === undefined ? '' : String(v));

  return (
    <div className="sticky top-16 z-30 border-b border-line bg-surface lg:top-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <form method="get" action="/search" role="search" aria-label="ค้นหาประกาศ" className="flex items-center gap-2 pt-2.5 pb-1.5">
          {Object.entries(q).filter(([k, v]) => k !== 'q' && v !== undefined).map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
          <SuggestInput key={query.q ?? ''} projects={projects} deal={deal} defaultValue={query.q ?? ''} placeholder="ค้นหาชื่อ ทำเล / โครงการ / รถไฟฟ้า" inputClassName="min-h-[46px]" />
          <button type="button" onClick={() => { setSheet(true); }} aria-haspopup="dialog" aria-label={filterCount > 0 ? `ตัวกรอง (ตั้งไว้ ${String(filterCount)} รายการ)` : 'ตัวกรอง'} className="inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3.5 font-semibold text-accent">
            <SlidersHorizontal aria-hidden className="size-5" /><span aria-hidden className="hidden sm:inline">ตัวกรอง</span>{filterCount > 0 && <span aria-hidden>({filterCount})</span>}
          </button>
          <Dropdown label="เรียงตาม" hideLabel variant="toolbar" align="end" className="hidden md:flex" options={SORTS.map(s => ({ value: s.id, label: s.label }))} value={query.sort ?? 'latest'} onChange={v => { go({ sort: v }); }} />
        </form>
        {/* ตัวกรองด่วนจัดแบบขึ้นบรรทัดใหม่ (ไม่ใช่แถวเลื่อน) เพื่อไม่ให้รายการของ Dropdown ถูกตัด · จอเล็กใช้ sheet "ตัวกรอง" แทน */}
        <div className="flex flex-wrap gap-2 pt-0.5 pb-2.5" aria-label="ตัวกรองด่วน" role="group">
          <div className="inline-flex shrink-0 rounded-full border border-line bg-surface-2 p-[3px]" aria-label="เช่าหรือซื้อ">
            {(['rent', 'sale'] as const).map(d => (
              <Link key={d} href={searchHref(q, { deal: d, price: undefined })} aria-current={deal === d ? 'true' : undefined} className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-full px-4 font-semibold text-muted aria-[current=true]:bg-accent aria-[current=true]:text-white">{d === 'rent' ? 'เช่า' : 'ซื้อ'}</Link>
            ))}
          </div>
          <Dropdown label="ประเภททรัพย์" hideLabel variant="toolbar" className="hidden md:flex" options={opts('ทุกประเภท', PROPERTY_TYPES)} value={str(query.type)} onChange={v => { go({ type: v || undefined }); }} />
          <Dropdown label="ช่วงราคา" hideLabel variant="toolbar" className="hidden md:flex" options={opts('ช่วงราคา (บาท)', PRICE_RANGES[deal])} value={str(query.price)} onChange={v => { go({ price: v || undefined }); }} />
          <Dropdown label="ห้องนอน" hideLabel variant="toolbar" className="hidden md:flex" options={BEDS} value={str(query.beds)} onChange={v => { go({ beds: v || undefined }); }} />
          <Dropdown label="ห้องน้ำ" hideLabel variant="toolbar" className="hidden md:flex" options={BATHS} value={str(query.baths)} onChange={v => { go({ baths: v || undefined }); }} />
          <Dropdown label="ขนาดพื้นที่ใช้สอย" hideLabel variant="toolbar" align="end" className="hidden md:flex" options={opts('ขนาดพื้นที่ใช้สอย', SIZE_RANGES)} value={str(query.size)} onChange={v => { go({ size: v || undefined }); }} />
        </div>
      </div>
      {/* portal ไปที่ body เพื่อให้ sheet อยู่เหนือปุ่มลอย (แถบนี้เป็น sticky z-30 ซึ่งสร้าง stacking context ของตัวเอง) */}
      {sheet && createPortal(<FilterSheet query={query} onClose={() => { setSheet(false); }} />, document.body)}
    </div>
  );
}

function FilterSheet({ query, onClose }: { query: SearchQuery; onClose: () => void }) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const deal = query.deal ?? 'sale';
  const str = (v: string | number | undefined) => (v === undefined ? '' : String(v));
  const [type, setType] = useState(str(query.type));
  const [price, setPrice] = useState(str(query.price));
  const [beds, setBeds] = useState(str(query.beds));
  const [baths, setBaths] = useState(str(query.baths));
  const [size, setSize] = useState(str(query.size));
  const [prov, setProv] = useState(query.prov ?? '');
  const [market, setMarket] = useState(query.market ?? '');
  const [sort, setSort] = useState(query.sort ?? 'latest');
  const [pet, setPet] = useState(Boolean(query.pet));
  const [transit, setTransit] = useState(Boolean(query.transit));

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role=listbox]')) onClose(); };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', onKey); opener?.focus(); };
  }, [onClose]);

  const apply = () => {
    onClose();
    router.push(searchHref(query, { type: type || undefined, price: price || undefined, beds: beds || undefined, baths: baths || undefined, size: size || undefined, prov: prov || undefined, area: prov === query.prov ? query.area : undefined, market: market || undefined, sort, pet: pet ? '1' : undefined, transit: transit ? '1' : undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 md:items-center md:justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="fs-h" className="flex max-h-[88dvh] w-full flex-col gap-3.5 overflow-y-auto rounded-t-[20px] bg-surface px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:max-w-[520px] md:rounded-[20px]">
        <div className="flex items-center justify-between">
          <h2 id="fs-h" className="text-lg font-semibold">ตัวกรอง</h2>
          <button ref={closeRef} type="button" aria-label="ปิดตัวกรอง" onClick={onClose} className="grid size-11 place-items-center rounded-full"><X aria-hidden className="size-6" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Dropdown label="ประเภททรัพย์" options={opts('ทุกประเภท', PROPERTY_TYPES)} value={type} onChange={setType} />
          <Dropdown label="ช่วงราคา" options={opts('ทุกราคา', PRICE_RANGES[deal])} value={price} onChange={setPrice} />
          <Dropdown label="ห้องนอน" options={opts('ไม่จำกัด', BEDS.slice(1).map(b => ({ id: b.value, label: b.label })))} value={beds} onChange={setBeds} />
          <Dropdown label="ห้องน้ำ" options={opts('ไม่จำกัด', BATHS.slice(1).map(b => ({ id: b.value, label: b.label })))} value={baths} onChange={setBaths} />
          <Dropdown label="ขนาดพื้นที่ใช้สอย" options={opts('ทุกขนาด', SIZE_RANGES)} value={size} onChange={setSize} />
          <Dropdown label="จังหวัด" options={opts('ทุกจังหวัด', PROVINCES)} value={prov} onChange={setProv} />
        </div>
        <Dropdown label="สภาพทรัพย์" options={[{ value: '', label: 'ทั้งมือ 1 และมือ 2' }, { value: 'new', label: 'มือ 1 / โครงการใหม่' }, { value: 'resale', label: 'มือ 2' }]} value={market} onChange={v => { setMarket(v); }} />
        <Dropdown label="เรียงตาม" options={SORTS.map(s => ({ value: s.id, label: s.label }))} value={sort} onChange={v => { setSort(v); }} />
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={pet} onChange={e => { setPet(e.target.checked); }} className="size-5 accent-accent" />เลี้ยงสัตว์ได้</label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={transit} onChange={e => { setTransit(e.target.checked); }} className="size-5 accent-accent" />ใกล้รถไฟฟ้า (ไม่เกิน 1 กม.)</label>
        <div className="sticky bottom-0 flex gap-2.5 bg-surface pt-2">
          <Link href={searchHref({ deal: query.deal })} onClick={onClose} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-line font-semibold">ล้างทั้งหมด</Link>
          <button type="button" onClick={apply} className="min-h-12 flex-[2] rounded-full bg-accent font-semibold text-white hover:bg-accent-strong">ดูผลลัพธ์</button>
        </div>
      </div>
    </div>
  );
}

export interface MapPin { slug: string; title: string; label: string; price: string; x: number; y: number }

/**
 * รายการคู่แผนที่: จอใหญ่แสดงแผนที่ติดด้านขวา · มือถือสลับ "แผนที่ / รายการ" ด้วยปุ่มลอย
 * แตะหมุด = ไฮไลต์การ์ดที่ตรงกัน (data-hl) และบนมือถือแสดงการ์ดย่อด้านล่างแผนที่
 */
export function ResultsWithMap({ pins, children }: { pins: MapPin[]; children: ReactNode }) {
  const [showMap, setShowMap] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const pin = pins.find(p => p.slug === active);

  const choose = (slug: string) => {
    setActive(slug);
    document.querySelectorAll<HTMLElement>('[data-slug]').forEach(el => { el.dataset.hl = String(el.dataset.slug === slug); });
    if (matchMedia('(min-width: 1024px)').matches) document.querySelector(`[data-slug="${slug}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_40%]">
      <div className={showMap ? 'hidden lg:block' : ''}>{children}</div>
      <aside aria-label="แผนที่ผลการค้นหา" className={`${showMap ? 'fixed inset-x-0 top-[180px] bottom-0 z-20 block' : 'hidden'} overflow-hidden lg:sticky lg:top-[230px] lg:block lg:h-[calc(100dvh-246px)] lg:rounded-2xl`}>
        <div className="relative size-full bg-[var(--map-bg)]">
          <MapArt label="แผนที่ประกอบตำแหน่งประกาศ" />
          {pins.map(p => (
            <button key={p.slug} type="button" aria-pressed={p.slug === active} aria-label={`${p.title} ${p.price}`} onClick={() => { choose(p.slug); }}
              className="group absolute z-[1] grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-full place-items-center aria-pressed:z-[3]" style={{ left: `${String(8 + p.x * 0.84)}%`, top: `${String(14 + p.y * 0.78)}%` }}>
              <span className="relative rounded-full bg-surface px-2.5 py-1 text-[13px] font-bold whitespace-nowrap shadow-md after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-surface group-aria-pressed:bg-navy group-aria-pressed:text-white group-aria-pressed:after:border-t-navy">{p.label}</span>
            </button>
          ))}
          <span className="absolute top-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs text-muted">แผนที่ประกอบ · ไม่ใช่ตำแหน่งจริง</span>
          {pin && (
            <Link href={`/homes/${pin.slug}`} className="absolute inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[4] rounded-2xl bg-surface p-3 shadow-xl lg:hidden">
              <b className="block">{pin.title}</b><span className="font-bold text-navy">{pin.price}</span>
            </Link>
          )}
        </div>
      </aside>
      <button type="button" aria-pressed={showMap} onClick={() => { setShowMap(v => !v); }} className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-40 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-navy px-5 font-semibold text-white shadow-xl lg:hidden">
        {showMap ? <><List aria-hidden className="size-5" />รายการ</> : <><MapIcon aria-hidden className="size-5" />แผนที่</>}
      </button>
    </div>
  );
}
