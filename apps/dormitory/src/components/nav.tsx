'use client';

import { Bell, DoorOpen, House, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'หน้าหลัก', icon: House },
  { href: '/rooms', label: 'ห้องพัก', icon: DoorOpen },
  { href: '/bills', label: 'บิล', icon: Receipt },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

/** มือถือ: เมนูอยู่ใน bottom nav · แท็บเล็ต: เมนูแถวที่สอง · เดสก์ท็อป: แถวเดียว (§15.2.4) */
export function Header({ building, nickname }: { building: string; nickname: string }) {
  const isActive = useActive();
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3.5 xl:h-[76px] xl:flex-nowrap xl:py-0">
      <Link href="/" className="flex min-h-11 items-center gap-2.5 font-display text-xl font-semibold text-green-deep">
        <span className="grid size-10 place-items-center rounded-2xl bg-green text-white"><House aria-hidden className="size-5" /></span>
        DormDee
      </Link>
      <span className="hidden items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium md:inline-flex">🏡 {building}</span>
      <nav aria-label="เมนูหลัก" className="order-3 hidden w-full gap-1 overflow-x-auto md:flex xl:order-none xl:ml-2 xl:w-auto">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className="inline-flex min-h-11 items-center rounded-full px-4 font-medium whitespace-nowrap text-muted hover:bg-surface hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <button type="button" aria-label="การแจ้งเตือน (มีรายการใหม่)" className="relative grid size-11 place-items-center rounded-full bg-surface text-muted">
          <Bell aria-hidden className="size-5" />
          <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-surface bg-coral" />
        </button>
        <span className="grid size-11 place-items-center rounded-full bg-sun font-semibold">{nickname}</span>
      </div>
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-green"
        >
          <Icon aria-hidden className="size-[22px]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
