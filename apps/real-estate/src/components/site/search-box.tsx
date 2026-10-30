'use client';

import { Building2, Home, MapPin, Search, Tag, TrainFront } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { searchHref, suggest, type Suggestion } from '@/features/homes/service';

const GROUP_ICON: Record<Suggestion['group'], ReactNode> = {
  ทำเล: <MapPin aria-hidden className="size-5" />,
  โครงการ: <Building2 aria-hidden className="size-5" />,
  รถไฟฟ้า: <TrainFront aria-hidden className="size-5" />,
  จังหวัด: <MapPin aria-hidden className="size-5" />,
};

/**
 * ช่องค้นหาพร้อมคำแนะนำ — combobox + listbox ตาม WAI-ARIA APG
 * ฟอร์มเป็น GET ไปที่ /search จึงยังค้นหาได้แม้ JavaScript ยังโหลดไม่เสร็จ
 */
export function SuggestInput({ projects, deal, defaultValue = '', placeholder, inputClassName = '' }: {
  projects: readonly { name: string; location: string }[];
  deal: 'sale' | 'rent';
  defaultValue?: string;
  placeholder: string;
  inputClassName?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [text, setText] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const items = open ? suggest(text, projects, deal) : [];
  const listId = `${id}-list`;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(-1, i - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); const it = items[active]; if (it) router.push(it.href); }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">คำค้น: ทำเล โครงการ หรือรถไฟฟ้า</label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${id}-o${String(active)}` : undefined}
        placeholder={placeholder}
        value={text}
        maxLength={60}
        onChange={e => { setText(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown}
        onBlur={() => { setOpen(false); }}
        className={`w-full rounded-full border border-line bg-surface pr-4 pl-12 text-ink outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 ${inputClassName}`}
      />
      <ul id={listId} role="listbox" aria-label="คำแนะนำ" hidden={!items.length} className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-auto rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-xl">
        {items.map((s, i) => {
          const head = s.group !== items[i - 1]?.group ? s.group : null;
          return (
            <li key={s.href + s.label} role="presentation">
              {head && <span className="block px-2.5 pt-1 text-xs font-semibold text-muted">{head}</span>}
              <Link
                id={`${id}-o${String(i)}`}
                role="option"
                aria-selected={i === active}
                href={s.href}
                onMouseDown={e => { e.preventDefault(); }}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-1.5 leading-snug ${i === active ? 'bg-accent-soft' : 'hover:bg-accent-soft'}`}
              >
                <span className="text-accent">{GROUP_ICON[s.group]}</span>
                <span>{s.label}<small className="block text-xs text-muted">{s.hint}</small></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const MODES = [
  { id: 'rent', title: 'เช่า', sub: 'เช่าบ้าน คอนโด อสังหาฯ', icon: <Tag aria-hidden className="size-6" /> },
  { id: 'sale', title: 'ซื้อ', sub: 'ซื้อบ้าน คอนโด ที่ดิน', icon: <Home aria-hidden className="size-6" /> },
] as const;

const QUICK = [
  ['คอนโดหรู', { deal: 'sale', type: 'condo', price: 'p4' }],
  ['เช่าคอนโด', { deal: 'rent', type: 'condo' }],
  ['ขายคอนโด', { deal: 'sale', type: 'condo' }],
  ['เช่าบ้าน', { deal: 'rent', type: 'house' }],
  ['ขายบ้าน', { deal: 'sale', type: 'house' }],
  ['ขายที่ดิน', { deal: 'sale', type: 'land' }],
] as const;

/** กล่องค้นหาของหน้าแรก: เลือก เช่า/ซื้อ (tabs) + ช่องค้นหาช่องเดียว + ลิงก์ลัด */
export function HeroSearch({ projects }: { projects: readonly { name: string; location: string }[] }) {
  const [deal, setDeal] = useState<'sale' | 'rent'>('rent');
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = deal === 'rent' ? 'sale' : 'rent';
    setDeal(next);
    document.getElementById(`mode-${next}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label="ต้องการเช่าหรือซื้อ" className="my-4 flex gap-2">
        {MODES.map(m => {
          const on = deal === m.id;
          return (
            <button key={m.id} id={`mode-${m.id}`} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} aria-controls="hero-search" onClick={() => { setDeal(m.id); }} onKeyDown={onTabKey}
              className={`flex min-h-16 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left sm:flex-none sm:basis-[210px] ${on ? 'border-white bg-surface text-navy' : 'border-white/30 bg-white/8 text-white'}`}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? 'bg-cta text-on-cta' : 'bg-white/12'}`}>{m.icon}</span>
              <span><b className="block text-[17px] leading-tight">{m.title}</b><small className={`block text-xs leading-snug ${on ? 'text-muted' : 'text-navy-muted'}`}>{m.sub}</small></span>
            </button>
          );
        })}
      </div>
      <form id="hero-search" role="search" aria-label="ค้นหาประกาศ" method="get" action="/search" className="rounded-[18px] bg-surface p-3 text-ink shadow-xl">
        <input type="hidden" name="deal" value={deal} />
        <div className="flex gap-2">
          <SuggestInput projects={projects} deal={deal} placeholder="กรอกชื่อ ทำเล / โครงการ / รถไฟฟ้า" inputClassName="min-h-[52px]" />
          <button type="submit" aria-label="ค้นหา" className="inline-flex min-h-[52px] min-w-[52px] items-center justify-center gap-2 rounded-full bg-accent px-4 font-semibold text-white hover:bg-accent-strong sm:px-7">
            <Search aria-hidden className="size-5" /><span className="hidden sm:inline">ค้นหา</span>
          </button>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-1.5">
          {QUICK.map(([label, q]) => (
            <Link key={label} href={searchHref(q)} className="inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-medium hover:bg-accent-soft hover:text-accent">{label}</Link>
          ))}
        </p>
      </form>
    </div>
  );
}
