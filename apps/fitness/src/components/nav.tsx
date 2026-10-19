'use client';

import { CalendarDays, CalendarPlus, ChartColumn, Dumbbell, HeartPulse, House, IdCard, LayoutGrid, Megaphone, Package, ScanLine, Users, Wallet, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission, ROLE_LABEL, type Permission, type Role } from '@/features/auth/roles';

interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  permission: Permission;
}

const NAV: NavItem[] = [
  { href: '/', label: 'แดชบอร์ด', icon: House, permission: 'dashboard.view' },
  { href: '/members', label: 'สมาชิก', icon: Users, permission: 'members.view' },
  { href: '/checkin', label: 'เช็กอิน', icon: ScanLine, permission: 'checkin.use' },
  { href: '/classes', label: 'ตารางคลาส', short: 'คลาส', icon: CalendarDays, permission: 'classes.view' },
  { href: '/trainers', label: 'เทรนเนอร์', icon: Dumbbell, permission: 'trainers.view' },
  { href: '/payments', label: 'การเงิน', icon: Wallet, permission: 'payments.view' },
  { href: '/retention', label: 'ติดตามสมาชิก', short: 'ติดตาม', icon: HeartPulse, permission: 'retention.view' },
  { href: '/marketing', label: 'การตลาด', icon: Megaphone, permission: 'marketing.manage' },
  { href: '/reports', label: 'รายงาน', icon: ChartColumn, permission: 'reports.view' },
  { href: '/packages', label: 'แพ็กเกจ', icon: Package, permission: 'packages.manage' },
  { href: '/me', label: 'บัตรสมาชิก', short: 'บัตร', icon: IdCard, permission: 'portal.use' },
  { href: '/me/classes', label: 'จองคลาส', icon: CalendarPlus, permission: 'portal.use' },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter(item => hasPermission(role, item.permission));
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' || href === '/me' ? pathname === href : pathname.startsWith(href));
}

export interface ShellUser {
  name: string;
  nickname: string;
  branch: string;
  role: Role;
}

/** แท็บเล็ต: sidebar แบบไอคอน · เดสก์ท็อป: sidebar เต็ม (§15.2.4) */
export function Sidebar({ user }: { user: ShellUser }) {
  const isActive = useActive();
  const items = navFor(user.role);
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 md:flex lg:px-4 lg:py-6">
      <Link href={items[0]?.href ?? '/'} className="flex min-h-11 items-center justify-center gap-2.5 font-display text-xl font-bold tracking-[.08em] lg:justify-start lg:px-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-lime text-bg">
          <Zap aria-hidden className="size-5" />
        </span>
        <span className="sr-only lg:not-sr-only">FITFLOW</span>
      </Link>
      <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
        <p className="mb-1 hidden px-3 text-[11px] uppercase tracking-[.14em] text-faint lg:block">เมนู</p>
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={isActive(href) ? 'page' : undefined}
            className="flex min-h-12 items-center justify-center gap-3 rounded-xl font-medium text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-lime/10 aria-[current=page]:text-lime lg:justify-start lg:px-3"
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            <span className="sr-only lg:not-sr-only">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-center gap-2.5 rounded-xl lg:justify-start lg:bg-surface-2 lg:p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-xs font-semibold text-bg">{user.nickname.slice(0, 3)}</span>
        <div className="hidden min-w-0 leading-tight lg:block">
          <b className="block truncate font-semibold">{user.name}</b>
          <small className="text-xs text-muted">{ROLE_LABEL[user.role]} · {user.branch}</small>
        </div>
      </div>
    </aside>
  );
}

/** มือถือ: bottom tab bar ไม่เกิน 5 เมนู ที่เหลืออยู่ในหน้า "เพิ่มเติม" (§15.2.4) */
export function BottomNav({ role }: { role: Role }) {
  const isActive = useActive();
  const items = navFor(role);
  const tabs = items.length <= 5 ? items : items.slice(0, 4);
  const showMore = items.length > 5;
  const cols = tabs.length + (showMore ? 1 : 0);
  return (
    <nav
      aria-label="เมนูหลัก"
      style={{ gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))` }}
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface/95 px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur md:hidden print:hidden"
    >
      {tabs.map(({ href, label, short, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-lime"
        >
          <Icon aria-hidden className="size-[22px]" />
          {short ?? label}
        </Link>
      ))}
      {showMore && (
        <Link href="/more" aria-current={isActive('/more') ? 'page' : undefined} className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-lime">
          <LayoutGrid aria-hidden className="size-[22px]" />
          เพิ่มเติม
        </Link>
      )}
    </nav>
  );
}

/** รายการเมนูทั้งหมดสำหรับหน้า "เพิ่มเติม" บนมือถือ */
export function MoreMenu({ role }: { role: Role }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {navFor(role).map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link href={href} className="flex min-h-20 flex-col items-start justify-between gap-2 rounded-2xl border border-line bg-surface p-4 font-semibold hover:border-lime">
            <Icon aria-hidden className="size-6 text-lime" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
