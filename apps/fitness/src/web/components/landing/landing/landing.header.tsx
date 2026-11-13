'use client';

import Link from 'next/link';
import { ChevronRight, LogIn, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LogoIcon, Wordmark } from '@/web/components/layout/layout/layout.logo';
import { pillGhost, pillPrimary } from './landing.styles';

const NAV = [
  { href: '#features', label: 'ฟีเจอร์' },
  { href: '#how', label: 'เริ่มใช้งาน' },
  { href: '#pricing', label: 'ราคา' },
  { href: '#contact', label: 'ติดต่อเรา' },
];

/** หัวเว็บหน้าแรก: โลโก้ · เมนู (จอใหญ่) · ทักแชท + ปุ่มเข้าสู่ระบบ · มือถือใช้ drawer */
export function LandingHeader({ chatUrl }: { chatUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = menuButton.current;
    document.body.style.overflow = 'hidden';
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    // เมนูนี้มีเฉพาะจอเล็กกว่า lg — ขยายจอ/หมุนจอจนเมนูเต็มแสดงบนหัวเว็บแล้ว ให้ปิดเอง ไม่ค้างทับหน้า
    const wide = matchMedia('(min-width: 1024px)');
    const closeOnWide = () => { if (wide.matches) setOpen(false); };
    closeOnWide();
    wide.addEventListener('change', closeOnWide);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', closeOnWide);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="FitFlow กลับขึ้นด้านบน" className="mr-auto flex min-h-11 items-center gap-2.5 lg:mr-0">
            <LogoIcon className="size-[38px] rounded-[11px]" />
            <span className="flex flex-col leading-tight">
              <Wordmark className="text-lg" />
              <span className="font-display text-[10.5px] font-medium tracking-[.16em] text-muted uppercase">Gym Management</span>
            </span>
          </a>
          <nav aria-label="เมนูหลัก" className="mx-auto hidden gap-0.5 lg:flex">
            {NAV.map(n => <a key={n.href} href={n.href} className="inline-flex min-h-11 items-center rounded-full px-3.5 font-display text-[15px] font-medium text-muted hover:text-lime">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            {chatUrl && <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center rounded-full px-3 font-display text-[15px] font-semibold hover:text-lime sm:inline-flex">ทักแชทสอบถาม</a>}
            <Link href="/login" className={`${pillPrimary} min-h-11 px-3.5 text-[15px] sm:px-[18px]`}><LogIn aria-hidden className="size-5" />เข้าสู่ระบบ</Link>
            <button ref={menuButton} type="button" onClick={() => { setOpen(true); }} aria-expanded={open} aria-controls="landing-drawer" aria-label="เปิดเมนู" className="inline-grid size-11 place-items-center rounded-xl border border-line bg-surface lg:hidden">
              <Menu aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div id="landing-drawer" className="fixed inset-0 z-60">
          <div className="absolute inset-0 bg-ink/45" onClick={() => { setOpen(false); }} />
          <div role="dialog" aria-modal="true" aria-label="เมนู" className="absolute top-3 right-3 flex max-h-[calc(100dvh-24px)] w-[min(340px,88vw)] flex-col gap-2 overflow-y-auto rounded-[24px] border border-line bg-surface px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_24px_70px_-28px_color-mix(in_oklab,var(--color-ink)_45%,transparent)]">
            <div className="flex min-h-13 items-center justify-between">
              <Wordmark className="text-lg" />
              <button type="button" onClick={() => { setOpen(false); }} aria-label="ปิดเมนู" className="inline-grid size-11 place-items-center rounded-xl border border-line"><X aria-hidden className="size-5" /></button>
            </div>
            <nav aria-label="เมนูหลัก" className="grid gap-0.5">
              {NAV.map((n, i) => (
                <a key={n.href} ref={i === 0 ? firstLink : undefined} href={n.href} onClick={() => { setOpen(false); }} className="flex min-h-13 items-center justify-between rounded-xl px-3 font-display text-lg font-semibold hover:bg-surface-2">
                  {n.label}<ChevronRight aria-hidden className="size-5 text-faint" />
                </a>
              ))}
            </nav>
            <div className="grid gap-2.5 pt-3">
              <Link href="/login" className={`${pillPrimary} min-h-[54px] text-[17px]`}><LogIn aria-hidden className="size-5" />เข้าสู่ระบบ</Link>
              {chatUrl && <a href={chatUrl} target="_blank" rel="noopener noreferrer" className={`${pillGhost} min-h-[54px] text-[17px]`}>ทักแชทสอบถาม</a>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
