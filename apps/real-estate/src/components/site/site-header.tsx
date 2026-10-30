'use client';

import { ChevronDown, Heart, Home, Menu, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DIRECTORY } from '@/features/homes/catalog';
import { searchHref } from '@/features/homes/service';
import { FavoriteCount } from './favorites';

const noop = () => () => undefined;
/** true หลัง hydrate เสร็จ — กันผู้ใช้กดปุ่มเมนูตอนที่ยังไม่ทำงาน */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const NAV = [
  { label: 'ซื้อ', query: { deal: 'sale' } },
  { label: 'เช่า', query: { deal: 'rent' } },
  { label: 'โครงการใหม่', query: { deal: 'sale', market: 'new' } },
  { label: 'มือสอง', query: { deal: 'sale', market: 'resale' } },
  { label: 'ใกล้รถไฟฟ้า', query: { transit: '1' } },
] as const;

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link href="/" className={`flex min-h-11 items-center gap-2 text-[21px] font-bold ${onDark ? 'text-white' : 'text-navy'}`}>
      <span aria-hidden className="grid size-[34px] place-items-center rounded-[9px] bg-cta text-on-cta"><Home className="size-5" strokeWidth={2.5} /></span>
      <span>Baan<span className="font-medium text-cta">Hub</span></span>
    </Link>
  );
}

/** เดสก์ท็อป: เมนู 2 ชั้น · จอ < 1024px: hamburger → drawer (§15.2.4) */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const hydrated = useHydrated();
  const burger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const burgerEl = burger.current;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      removeEventListener('keydown', onKey);
      burgerEl?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!quick) return;
    const onDown = (e: PointerEvent) => { if (!quickRef.current?.contains(e.target as Node)) setQuick(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setQuick(false); quickRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); };
  }, [quick]);

  // เมนูที่ตรงกับหน้าค้นหาปัจจุบันที่สุด (ทุกคีย์ของเมนูต้องตรง และไม่มีตัวกรองตลาดเกินมา) — §15.4
  const isCurrent = (q: Record<string, string>) =>
    pathname === '/search' && Object.entries(q).every(([k, v]) => params.get(k) === v) && ('market' in q || !params.get('market'));

  return (
    <header className="sticky top-0 z-40 bg-navy text-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-4 md:px-6 lg:min-h-24">
        <Logo onDark />
        <div className="ml-auto hidden flex-col items-end lg:flex">
          <div className="flex items-center gap-0.5 text-[13px] text-navy-muted">
            <Link href="/agent/login" className="inline-flex min-h-11 items-center px-2 hover:text-white">เข้าสู่ระบบ agent</Link>
            <span aria-hidden className="mx-1 h-3.5 w-px bg-white/25" />
            <Link href="/favorites" aria-label="รายการโปรด" className="relative grid size-11 place-items-center rounded-full hover:bg-white/10"><Heart aria-hidden className="size-[18px]" /><FavoriteCount /></Link>
            <span aria-hidden className="mx-1 h-3.5 w-px bg-white/25" />
            <a href="#site-footer" className="inline-flex min-h-11 items-center px-2 hover:text-white">ติดต่อเรา</a>
          </div>
          <nav aria-label="เมนูหลัก" className="flex items-center gap-0.5">
            <div ref={quickRef} className="relative">
              <button type="button" aria-expanded={quick} aria-controls="quick-search" onClick={() => { setQuick(v => !v); }} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-medium text-navy-muted hover:bg-white/10 hover:text-white aria-expanded:text-white">
                ค้นหาด่วน<ChevronDown aria-hidden className={`size-4 transition-transform ${quick ? 'rotate-180' : ''}`} />
              </button>
              {quick && (
                <div id="quick-search" className="absolute top-full right-0 z-50 mt-1.5 grid w-[560px] grid-cols-3 gap-x-4 rounded-2xl border border-line bg-surface p-4 text-ink shadow-xl">
                  {DIRECTORY.slice(0, 3).map(d => (
                    <div key={d.title}>
                      <p className="text-sm font-semibold text-navy">{d.title}</p>
                      {d.places.slice(0, 4).map(p => (
                        <Link key={p} href={searchHref(d.base, { q: p })} onClick={() => { setQuick(false); }} className="flex min-h-11 items-center text-sm text-muted hover:text-accent hover:underline">{d.title.split(' ')[0]} {p}</Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {NAV.map(item => {
              const current = isCurrent(item.query);
              return (
                <Link key={item.label} href={searchHref(item.query)} aria-current={current ? 'page' : undefined} className={`inline-flex min-h-11 items-center px-3 font-medium ${current ? 'text-white shadow-[inset_0_-3px_0_var(--color-cta)]' : 'rounded-full text-navy-muted hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>
              );
            })}
            <Link href="/agent/login" className="ml-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-cta px-4 font-semibold text-on-cta hover:bg-cta-strong"><Plus aria-hidden className="size-5" />ลงประกาศ</Link>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-0.5 lg:hidden">
          <Link href="/favorites" aria-label="รายการโปรด" className="relative grid size-11 place-items-center rounded-full"><Heart aria-hidden className="size-5" /><FavoriteCount /></Link>
          <Link href="/agent/login" aria-label="ลงประกาศ" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-cta font-semibold text-on-cta sm:px-4"><Plus aria-hidden className="size-5" /><span className="hidden sm:inline">ลงประกาศ</span></Link>
          <button ref={burger} type="button" aria-label="เปิดเมนู" aria-expanded={open} aria-controls="drawer" disabled={!hydrated} onClick={() => { setOpen(true); }} className="grid size-11 place-items-center rounded-full">
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
      </div>

      {open && (
        <div id="drawer" className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="เมนู" className="absolute top-0 right-0 flex h-dvh w-[min(320px,86vw)] flex-col gap-1 overflow-y-auto bg-surface px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] text-ink shadow-2xl">
            <div className="mb-1.5 flex items-center justify-between font-semibold">
              เมนู
              <button ref={close} type="button" aria-label="ปิดเมนู" onClick={() => { setOpen(false); }} className="grid size-11 place-items-center rounded-full">
                <X aria-hidden className="size-6" />
              </button>
            </div>
            <nav aria-label="เมนูหลัก" className="flex flex-col">
              <Link href="/" onClick={() => { setOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent-soft"><Home aria-hidden className="size-5 text-muted" />หน้าแรก</Link>
              {NAV.map(item => (
                <Link key={item.label} href={searchHref(item.query)} onClick={() => { setOpen(false); }} aria-current={isCurrent(item.query) ? 'page' : undefined} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent-soft aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"><Search aria-hidden className="size-5 text-muted" />{item.label}</Link>
              ))}
              <Link href="/favorites" onClick={() => { setOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent-soft"><Heart aria-hidden className="size-5 text-muted" />รายการโปรด</Link>
            </nav>
            <hr className="my-2 border-line" />
            <Link href="/agent/login" onClick={() => { setOpen(false); }} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-cta font-semibold text-on-cta"><Plus aria-hidden className="size-5" />ลงประกาศ</Link>
            <Link href="/agent/login" onClick={() => { setOpen(false); }} className="mt-2 flex min-h-12 items-center justify-center rounded-full border border-line font-semibold">เข้าสู่ระบบ agent</Link>
          </div>
        </div>
      )}
    </header>
  );
}
