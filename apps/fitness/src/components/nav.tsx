'use client';

import { BellRing, ChevronRight, CalendarDays, CalendarPlus, ChartColumn, Dumbbell, HeartPulse, House, IdCard, LayoutDashboard, LayoutGrid, Megaphone, Package, RefreshCw, ScanLine, Store, TicketPercent, Users, Wallet, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  icon: LucideIcon;
  /** หัวข้อหมวดที่โซนนี้อยู่ (แสดงเป็นเส้นคั่นพร้อมชื่อบนเดสก์ท็อป) */
  section: string;
  /** สีประจำโซน (ไอคอนกล่อง) */
  tone: 'lime' | 'cyan' | 'violet' | 'warn' | 'danger';
  items: NavItem[];
}

const TONE: Record<NavGroup['tone'], string> = {
  lime: 'border-lime/30 bg-lime/10 text-lime',
  cyan: 'border-cyan/30 bg-cyan/10 text-cyan',
  violet: 'border-violet/30 bg-violet/10 text-violet',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

/** เมนูแบ่งเป็นโซนตามงาน — กดเมนูหลักแล้วกางเมนูย่อย */
const GROUPS: NavGroup[] = [
  { id: 'overview', label: 'ภาพรวม', section: 'ภาพรวม · รายงาน', tone: 'lime', icon: LayoutDashboard, items: [
    { href: '/', label: 'แดชบอร์ด', icon: House, permission: 'dashboard.view', primary: true },
    { href: '/reports', label: 'รายงาน', icon: ChartColumn, permission: 'reports.view' },
  ] },
  { id: 'front', label: 'หน้าร้าน', section: 'หน้าร้าน · คลาส', tone: 'cyan', icon: Store, items: [
    { href: '/checkin', label: 'เช็กอิน', icon: ScanLine, permission: 'checkin.use', primary: true },
    { href: '/members', label: 'สมาชิก', icon: Users, permission: 'members.view', primary: true },
    { href: '/retention', label: 'ติดตามสมาชิก', short: 'ติดตาม', icon: HeartPulse, permission: 'retention.view' },
  ] },
  { id: 'classes', label: 'คลาสและเทรนเนอร์', short: 'คลาส', section: 'หน้าร้าน · คลาส', tone: 'violet', icon: CalendarDays, items: [
    { href: '/classes', label: 'ตารางคลาส', short: 'คลาส', icon: CalendarDays, permission: 'classes.view', primary: true },
    { href: '/trainers', label: 'เทรนเนอร์', icon: Dumbbell, permission: 'trainers.view' },
  ] },
  { id: 'money', label: 'การเงิน', section: 'การเงิน · การตลาด', tone: 'warn', icon: Wallet, items: [
    { href: '/payments', label: 'รายการชำระ', short: 'การเงิน', icon: Wallet, permission: 'payments.view' },
    { href: '/payments/subscriptions', label: 'ตัดบัตรอัตโนมัติ', icon: RefreshCw, permission: 'payments.view' },
    { href: '/packages', label: 'แพ็กเกจ', icon: Package, permission: 'packages.manage' },
  ] },
  { id: 'marketing', label: 'การตลาด', section: 'การเงิน · การตลาด', tone: 'danger', icon: Megaphone, items: [
    { href: '/marketing', label: 'แจ้งเตือนต่ออายุ', icon: BellRing, permission: 'marketing.manage' },
    { href: '/marketing/coupons', label: 'คูปอง & ชวนเพื่อน', icon: TicketPercent, permission: 'marketing.manage' },
  ] },
  { id: 'portal', label: 'สมาชิก', short: 'ของฉัน', section: 'สมาชิก', tone: 'lime', icon: IdCard, items: [
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
 * แบบ A — Accordion มีไอคอนกล่อง
 * - เดสก์ท็อป (≥ lg): กดโซนแล้วกางเมนูย่อย · โซนของหน้าปัจจุบันกางไว้และไอคอนเป็นสีเขียว
 * - แท็บเล็ต (md): แสดงไอคอนเมนูย่อยทั้งหมด แบ่งโซนด้วยเส้นคั่น (§15.2.4)
 */
export function Sidebar({ user }: { user: ShellUser }) {
  const groups = groupsFor(user.role);
  const activeHref = useActiveHref(groups.flatMap(g => g.items));
  const activeGroup = groups.find(g => g.items.some(i => i.href === activeHref))?.id;
  // ค่าเริ่มต้น: กางเฉพาะโซนของหน้าปัจจุบัน · ผู้ใช้กดกาง/พับเองได้ทุกโซน
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? (id === activeGroup || groups.length === 1);
  const toggle = (id: string) => {
    setToggled(t => ({ ...t, [id]: !isOpen(id) }));
  };

  return (
    <aside className="scrollbar-none sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 md:flex lg:px-3 lg:py-6">
      <Link href={groups[0]?.items[0]?.href ?? '/'} className="flex min-h-11 items-center justify-center gap-2.5 font-display text-xl font-bold tracking-[.08em] lg:justify-start lg:px-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-lime text-bg">
          <Zap aria-hidden className="size-5" />
        </span>
        <span className="sr-only lg:not-sr-only">FITFLOW</span>
      </Link>
      <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
        {groups.map((g, gi) => {
          const open = isOpen(g.id);
          const current = g.id === activeGroup;
          const listId = `nav-${g.id}`;
          const newSection = g.section !== groups[gi - 1]?.section;
          return (
            <div key={g.id} className={gi > 0 ? 'border-t border-line pt-1.5 lg:border-0 lg:pt-0' : ''}>
              {newSection && (
                <p className={`hidden items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold tracking-[.14em] text-faint after:h-px after:flex-1 after:bg-line lg:flex ${gi > 0 ? 'pt-4' : ''}`}>
                  {g.section}
                </p>
              )}
              <button
                type="button"
                onClick={() => { toggle(g.id); }}
                aria-expanded={open}
                aria-controls={listId}
                className={`hidden min-h-12 w-full items-center gap-3 rounded-xl px-2 font-semibold whitespace-nowrap hover:bg-surface-2 lg:flex ${current || open ? 'text-ink' : 'text-ink/85'}`}
              >
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-[10px] border ${TONE[g.tone]}`}>
                  <g.icon className="size-[17px]" />
                </span>
                <span className="flex-1 text-left">{g.short ?? g.label}</span>
                <ChevronRight aria-hidden className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
              </button>
              <ul id={listId} className={`flex flex-col gap-0.5 lg:mb-1 lg:ml-[23px] lg:border-l lg:border-line lg:py-1 lg:pl-3 ${open ? '' : 'lg:hidden'}`}>
                {g.items.map(({ href, label, icon: Icon }) => {
                  const here = href === activeHref;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        title={`${g.label} › ${label}`}
                        aria-current={here ? 'page' : undefined}
                        className="relative flex min-h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-lime/10 aria-[current=page]:text-lime lg:min-h-10 lg:justify-start lg:rounded-lg lg:px-3 lg:text-[14.5px] lg:aria-[current=page]:font-semibold"
                      >
                        <Icon aria-hidden className="size-5 lg:hidden" />
                        <span className="sr-only lg:not-sr-only">{label}</span>
                        {/* ไฮไลต์บนเส้นนำทางด้านซ้าย */}
                        {here && <span aria-hidden className="absolute inset-y-2 -left-[13.5px] hidden w-0.5 rounded-full bg-lime lg:block" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
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
