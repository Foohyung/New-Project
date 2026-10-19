'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const noop = () => () => undefined;
/** true หลัง hydrate เสร็จ — กันผู้ใช้กดปุ่มเมนูตอนที่ยังไม่ทำงาน */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const NAV = [
  { href: '/', label: 'ซื้อบ้าน' },
  { href: '/?listing=rent#homes', label: 'เช่า' },
  { href: '/#hoods', label: 'ย่านน่าอยู่' },
  { href: '/#calc', label: 'คำนวณสินเชื่อ' },
] as const;

/** เดสก์ท็อป: เมนูเต็ม · จอ < 1024px: hamburger → drawer (§15.2.4) */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const burger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

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

  return (
    <header className="mx-auto flex h-[76px] max-w-6xl items-center gap-6 px-4 sm:px-7">
      <Link href="/" className="flex min-h-11 items-center gap-2.5 font-display text-2xl font-semibold">
        <span aria-hidden className="grid size-10 place-items-center rounded-t-full rounded-b-xl bg-terra text-lg text-cream">⌂</span>
        BaanHub
      </Link>
      <nav aria-label="เมนูหลัก" className="hidden gap-1 font-medium text-muted lg:flex">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-full px-3 hover:text-ink">{item.label}</Link>
        ))}
      </nav>
      <div className="ml-auto hidden items-center gap-3 sm:flex">
        <Link href="/#homes" className="inline-flex min-h-11 items-center rounded-full bg-terra px-5 font-semibold text-cream hover:bg-terra-deep">ฝากขาย</Link>
      </div>
      <button
        ref={burger}
        type="button"
        aria-label="เปิดเมนู"
        aria-expanded={open}
        aria-controls="drawer"
        disabled={!hydrated}
        onClick={() => { setOpen(true); }}
        className="ml-auto grid size-11 place-items-center rounded-xl border border-line sm:ml-0 lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      {open && (
        <div id="drawer" className="fixed inset-0 z-50 bg-black/45 lg:hidden" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="เมนู" className="absolute top-0 right-0 flex h-dvh w-[min(340px,88vw)] flex-col gap-1 overflow-y-auto bg-cream px-4.5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-1.5 flex items-center justify-between font-semibold">
              เมนู
              <button ref={close} type="button" aria-label="ปิดเมนู" onClick={() => { setOpen(false); }} className="grid size-11 place-items-center rounded-xl">
                <X aria-hidden className="size-6" />
              </button>
            </div>
            <nav aria-label="เมนูหลัก" className="flex flex-col">
              {NAV.map(item => (
                <Link key={item.href} href={item.href} onClick={() => { setOpen(false); }} className="flex min-h-12 items-center rounded-xl px-3 text-lg font-semibold">{item.label}</Link>
              ))}
            </nav>
            <Link href="/#homes" onClick={() => { setOpen(false); }} className="mt-3 flex min-h-[52px] items-center justify-center rounded-full bg-terra font-semibold text-cream">ฝากขาย</Link>
          </div>
        </div>
      )}
    </header>
  );
}
