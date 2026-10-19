'use client';

import { BellRing, CalendarDays, CalendarPlus, ChartColumn, Dumbbell, HeartPulse, House, IdCard, LayoutDashboard, LayoutGrid, Megaphone, Package, RefreshCw, ScanLine, Store, TicketPercent, Users, Wallet, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { hasPermission, ROLE_LABEL, type Permission, type Role } from '@/features/auth/roles';

interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  permission: Permission;
  /** แสดงบนแถบล่างของมือถือ (ที่เหลืออยู่ในหน้า "เมนู") */
  primary?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  /** ชื่อสั้นบน rail */
  short?: string;
  hint: string;
  icon: LucideIcon;
  items: NavItem[];
}

/** เมนูแบ่งเป็นโซนตามงาน — กดเมนูหลักแล้วกางเมนูย่อย */
const GROUPS: NavGroup[] = [
  { id: 'overview', label: 'ภาพรวม', hint: 'ตัวเลขทั้งยิม', icon: LayoutDashboard, items: [
    { href: '/', label: 'แดชบอร์ด', icon: House, permission: 'dashboard.view', primary: true },
    { href: '/reports', label: 'รายงาน', icon: ChartColumn, permission: 'reports.view' },
  ] },
  { id: 'front', label: 'หน้าร้าน', hint: 'งานเคาน์เตอร์ประจำวัน', icon: Store, items: [
    { href: '/checkin', label: 'เช็กอิน', icon: ScanLine, permission: 'checkin.use', primary: true },
    { href: '/members', label: 'สมาชิก', icon: Users, permission: 'members.view', primary: true },
    { href: '/retention', label: 'ติดตามสมาชิก', short: 'ติดตาม', icon: HeartPulse, permission: 'retention.view' },
  ] },
  { id: 'classes', label: 'คลาสและเทรนเนอร์', short: 'คลาส', hint: 'ตารางคลาสและคิว PT', icon: CalendarDays, items: [
    { href: '/classes', label: 'ตารางคลาส', short: 'คลาส', icon: CalendarDays, permission: 'classes.view', primary: true },
    { href: '/trainers', label: 'เทรนเนอร์', icon: Dumbbell, permission: 'trainers.view' },
  ] },
  { id: 'money', label: 'การเงิน', hint: 'รับเงินและรายได้ประจำ', icon: Wallet, items: [
    { href: '/payments', label: 'รายการชำระ', short: 'การเงิน', icon: Wallet, permission: 'payments.view' },
    { href: '/payments/subscriptions', label: 'ตัดบัตรอัตโนมัติ', icon: RefreshCw, permission: 'payments.view' },
    { href: '/packages', label: 'แพ็กเกจ', icon: Package, permission: 'packages.manage' },
  ] },
  { id: 'marketing', label: 'การตลาด', hint: 'หาเงิน + รักษาสมาชิก', icon: Megaphone, items: [
    { href: '/marketing', label: 'แจ้งเตือนต่ออายุ', icon: BellRing, permission: 'marketing.manage' },
    { href: '/marketing/coupons', label: 'คูปอง & ชวนเพื่อน', icon: TicketPercent, permission: 'marketing.manage' },
  ] },
  { id: 'portal', label: 'สมาชิก', short: 'ของฉัน', hint: 'บัตรและการจองของฉัน', icon: IdCard, items: [
    { href: '/me', label: 'บัตรสมาชิก', short: 'บัตร', icon: IdCard, permission: 'portal.use', primary: true },
    { href: '/me/classes', label: 'จองคลาส', icon: CalendarPlus, permission: 'portal.use', primary: true },
  ] },
];

/** โซนที่บทบาทนี้เห็น (ตัดเมนูที่ไม่มีสิทธิ์ และโซนที่ว่างออก) */
export function groupsFor(role: Role): NavGroup[] {
  return GROUPS.map(g => ({ ...g, items: g.items.filter(i => hasPermission(role, i.permission)) })).filter(g => g.items.length > 0);
}

export function navFor(role: Role): NavItem[] {
  return groupsFor(role).flatMap(g => g.items);
}

/** เมนูที่ตรงกับหน้าปัจจุบัน = href ที่ยาวที่สุดที่เป็นต้นทางของ path (เช่น /payments/subscriptions ไม่ทำให้ /payments ติด) */
function useActiveHref(items: NavItem[]): string | undefined {
  const pathname = usePathname();
  return items
    .map(i => i.href)
    .filter(href => (href === '/' || href === '/me' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}

export interface ShellUser {
  name: string;
  nickname: string;
  branch: string;
  role: Role;
}

/**
 * แบบ B — Rail + แผงเมนูย่อย
 * - rail ซ้ายสุดแสดงเฉพาะโซน (ไอคอน + ชื่อสั้น) · กดโซนแล้วแผงข้าง ๆ แสดงเมนูย่อยของโซนนั้น
 * - เดสก์ท็อป (≥ lg): แผงแสดงค้างไว้ · แท็บเล็ต (md): แผงเปิดเป็น overlay เมื่อกดโซน (§15.2.4)
 */
export function Sidebar({ user }: { user: ShellUser }) {
  const groups = groupsFor(user.role);
  const activeHref = useActiveHref(groups.flatMap(g => g.items));
  const activeGroup = groups.find(g => g.items.some(i => i.href === activeHref))?.id ?? groups[0]?.id;
  // โซนที่ผู้ใช้กดดู (ค่าเริ่มต้น = โซนของหน้าปัจจุบัน) และ overlay ของแท็บเล็ต
  const [picked, setPicked] = useState<{ id: string; from: string | undefined } | null>(null);
  const [overlay, setOverlay] = useState(false);
  const pathname = usePathname();
  const selectedId = picked && picked.from === pathname ? picked.id : activeGroup;
  const selected = groups.find(g => g.id === selectedId) ?? groups[0];
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlay(false);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!panelRef.current?.contains(target) && !target.closest('[data-rail]')) setOverlay(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [overlay]);

  return (
    <nav aria-label="เมนูหลัก" className="sticky top-0 z-40 hidden h-dvh md:flex">
      <div data-rail className="scrollbar-none flex w-[76px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r border-line bg-surface px-2 py-4">
        <Link href={groups[0]?.items[0]?.href ?? '/'} aria-label="FitFlow หน้าแรก" className="mb-3 grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-bg">
          <Zap aria-hidden className="size-5" />
        </Link>
        {groups.map(g => {
          const isSelected = g.id === selected?.id;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={isSelected}
              aria-controls="nav-panel"
              onClick={() => {
                setPicked({ id: g.id, from: pathname });
                setOverlay(o => (g.id === selected?.id ? !o : true));
              }}
              className={`flex min-h-14 w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] leading-tight font-semibold transition-colors ${isSelected ? 'bg-lime/12 text-lime' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}
            >
              <span className="relative">
                <g.icon aria-hidden className="size-5" />
                {isActive && !isSelected && <span aria-hidden className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-lime" />}
              </span>
              {g.short ?? g.label}
            </button>
          );
        })}
        <span title={`${user.name} · ${ROLE_LABEL[user.role]}`} className="mt-auto grid size-9 shrink-0 place-items-center rounded-full bg-lime text-xs font-semibold text-bg">{user.nickname.slice(0, 3)}</span>
      </div>

      {selected && (
        <div
          ref={panelRef}
          id="nav-panel"
          className={`w-[188px] shrink-0 flex-col gap-1 border-r border-line bg-surface px-2.5 py-5 lg:flex ${overlay ? 'fixed inset-y-0 left-[76px] z-50 flex shadow-[24px_0_48px_-24px_#000] lg:static lg:shadow-none' : 'hidden'}`}
        >
          <h2 className="px-2.5 font-display text-base font-semibold">{selected.label}</h2>
          <p className="px-2.5 pb-3 text-xs text-faint">{selected.hint}</p>
          <ul className="flex flex-col gap-1">
            {selected.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => { setOverlay(false); }}
                  aria-current={href === activeHref ? 'page' : undefined}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 font-medium text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_3px_0_0_var(--color-lime)] [&[aria-current=page]_svg]:text-lime"
                >
                  <Icon aria-hidden className="size-[18px] shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto rounded-xl bg-surface-2 p-3 leading-tight">
            <b className="block truncate text-sm font-semibold">{user.name}</b>
            <small className="text-xs text-muted">{ROLE_LABEL[user.role]} · {user.branch}</small>
          </div>
        </div>
      )}
    </nav>
  );
}

/** มือถือ: bottom tab bar ไม่เกิน 5 เมนู ที่เหลืออยู่ในหน้า "เพิ่มเติม" (§15.2.4) */
export function BottomNav({ role }: { role: Role }) {
  const items = navFor(role);
  const activeHref = useActiveHref(items);
  const pathname = usePathname();
  const tabs = items.length <= 5 ? items : items.filter(i => i.primary).slice(0, 4);
  const showMore = tabs.length < items.length;
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
          aria-current={href === activeHref ? 'page' : undefined}
          className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-lime"
        >
          <Icon aria-hidden className="size-[22px]" />
          {short ?? label}
        </Link>
      ))}
      {showMore && (
        <Link href="/more" aria-current={pathname === '/more' || (activeHref !== undefined && !tabs.some(t => t.href === activeHref)) ? 'page' : undefined} className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-lime">
          <LayoutGrid aria-hidden className="size-[22px]" />
          เมนู
        </Link>
      )}
    </nav>
  );
}

/** หน้ารวมเมนูของมือถือ: แบ่งตามโซนเหมือน sidebar */
export function MoreMenu({ role }: { role: Role }) {
  return (
    <div className="flex flex-col gap-5">
      {groupsFor(role).map(g => (
        <section key={g.id} aria-labelledby={`more-${g.id}`} className="flex flex-col gap-2">
          <h2 id={`more-${g.id}`} className="flex items-center gap-2 font-display text-base font-semibold text-muted">
            <g.icon aria-hidden className="size-4 text-lime" />{g.label}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-20 flex-col items-start justify-between gap-2 rounded-2xl border border-line bg-surface p-4 font-semibold hover:border-lime">
                  <Icon aria-hidden className="size-6 text-lime" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
