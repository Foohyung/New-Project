'use client';

import { BookUser, Building2, ChevronRight, FileSignature, FolderOpen, House, LayoutDashboard, LayoutGrid, LogOut, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { hasPermission, ROLE_LABEL, type Permission, type Role } from '@/features/auth/roles';
import { ConfirmForm } from './confirm-form';

interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  permission: Permission;
  /** แสดงบนแถบล่างของมือถือ (ที่เหลืออยู่ในหน้า "เมนู") */
  primary?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** หัวข้อหมวดที่โซนนี้อยู่ */
  section: string;
  tone: 'accent' | 'ok' | 'violet' | 'warn';
  items: NavItem[];
}

const TONE: Record<NavGroup['tone'], string> = {
  accent: 'border-accent/30 bg-accent-soft text-accent',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  violet: 'border-violet/30 bg-violet-soft text-violet',
  warn: 'border-warn/30 bg-warn-soft text-warn',
};

/** เมนูแบ่งโซนตามงาน (§15.4) */
const GROUPS: NavGroup[] = [
  { id: 'overview', label: 'ภาพรวม', section: 'ภาพรวม', tone: 'accent', icon: LayoutDashboard, items: [
    { href: '/agent', label: 'แดชบอร์ด', short: 'ภาพรวม', icon: House, permission: 'dashboard.view', primary: true },
  ] },
  { id: 'stock', label: 'สต็อกทรัพย์', section: 'งานทรัพย์', tone: 'ok', icon: Building2, items: [
    { href: '/agent/stock', label: 'ทรัพย์และยูนิต', short: 'สต็อก', icon: Building2, permission: 'stock.view', primary: true },
    { href: '/agent/owners', label: 'เจ้าของทรัพย์', icon: UserRound, permission: 'owners.view' },
    { href: '/agent/clients', label: 'ลูกค้า', icon: Users, permission: 'clients.manage' },
  ] },
  { id: 'docs', label: 'สัญญาและเอกสาร', section: 'เอกสาร', tone: 'violet', icon: FileSignature, items: [
    { href: '/agent/contracts', label: 'สัญญา', icon: FileSignature, permission: 'contracts.manage', primary: true },
    { href: '/agent/documents', label: 'คลังเอกสาร', short: 'เอกสาร', icon: FolderOpen, permission: 'documents.manage' },
  ] },
  { id: 'money', label: 'บัญชี', section: 'การเงิน', tone: 'warn', icon: Wallet, items: [
    { href: '/agent/ledger', label: 'รายรับ-รายจ่าย / ค่าคอม', short: 'บัญชี', icon: Wallet, permission: 'ledger.view', primary: true },
  ] },
];

export function groupsFor(role: Role): NavGroup[] {
  return GROUPS.map(g => ({ ...g, items: g.items.filter(i => hasPermission(role, i.permission)) })).filter(g => g.items.length > 0);
}

/** เมนูที่ตรงกับหน้าปัจจุบัน = href ที่ยาวที่สุดที่เป็นต้นทางของ path */
function useActiveHref(items: NavItem[]): string | undefined {
  const pathname = usePathname();
  return items
    .map(i => i.href)
    .filter(href => (href === '/agent' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}

export interface ShellUser {
  name: string;
  initials: string;
  role: Role;
}

/**
 * เดสก์ท็อป (≥ lg): โซนมีหัวข้อหมวด กดแล้วกางเมนูย่อย · แท็บเล็ต (md): ไอคอนคั่นโซนด้วยเส้น (§15.2.4)
 */
export function Sidebar({ user, logoutAction }: { user: ShellUser; logoutAction: () => Promise<void> }) {
  const groups = groupsFor(user.role);
  const activeHref = useActiveHref(groups.flatMap(g => g.items));
  const activeGroup = groups.find(g => g.items.some(i => i.href === activeHref))?.id;
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === activeGroup;

  return (
    <aside className="scrollbar-none sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/agent" className="flex min-h-11 items-center justify-center gap-2 lg:justify-start lg:px-2">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-accent text-on-accent"><House className="size-[18px]" /></span>
        <span className="sr-only text-xl font-bold tracking-tight text-accent lg:not-sr-only">BaanHub</span>
        <span className="sr-only rounded-md bg-surface-2 px-1.5 text-xs font-semibold text-muted lg:not-sr-only">Agent</span>
      </Link>
      <nav aria-label="เมนูหลังบ้าน" className="flex flex-col gap-1">
        {groups.map((g, gi) => {
          const open = isOpen(g.id);
          const listId = `nav-${g.id}`;
          return (
            <div key={g.id} className={gi > 0 ? 'border-t border-line pt-1.5 lg:border-0 lg:pt-0' : ''}>
              <p className={`hidden items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold tracking-[.12em] text-faint after:h-px after:flex-1 after:bg-line lg:flex ${gi > 0 ? 'pt-4' : ''}`}>{g.section}</p>
              <button
                type="button"
                onClick={() => { setToggled(t => ({ ...t, [g.id]: !open })); }}
                aria-expanded={open}
                aria-controls={listId}
                className="hidden min-h-12 w-full items-center gap-3 rounded-xl px-2 font-semibold whitespace-nowrap hover:bg-surface-2 lg:flex"
              >
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-[10px] border ${TONE[g.tone]}`}><g.icon className="size-[17px]" /></span>
                <span className="flex-1 text-left">{g.label}</span>
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
                        className="relative flex min-h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent lg:justify-start lg:rounded-lg lg:px-3 lg:text-[14.5px] lg:aria-[current=page]:font-semibold"
                      >
                        <Icon aria-hidden className="size-5 lg:hidden" />
                        <span className="sr-only lg:not-sr-only">{label}</span>
                        {here && <span aria-hidden className="absolute inset-y-2 -left-[13.5px] hidden w-0.5 rounded-full bg-accent lg:block" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2 lg:flex-row lg:rounded-xl lg:bg-surface-2 lg:p-2.5 lg:pl-3">
        <span title={`${user.name} · ${ROLE_LABEL[user.role]}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent">{user.initials}</span>
        <div className="hidden min-w-0 flex-1 leading-tight lg:block">
          <b className="block truncate text-sm font-semibold">{user.name}</b>
          <small className="block truncate text-xs text-muted">{ROLE_LABEL[user.role]}</small>
        </div>
        <LogoutButton logoutAction={logoutAction} />
      </div>
    </aside>
  );
}

export function LogoutButton({ logoutAction }: { logoutAction: () => Promise<void> }) {
  return (
    <ConfirmForm action={logoutAction} confirm="ต้องการออกจากระบบหรือไม่?" confirmTitle="ยืนยันออกจากระบบ" confirmLabel="ออกจากระบบ">
      <button type="submit" aria-label="ออกจากระบบ" title="ออกจากระบบ" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger">
        <LogOut aria-hidden className="size-5" />
      </button>
    </ConfirmForm>
  );
}

/** มือถือ: แถบล่าง 4 เมนูที่ใช้บ่อย + "เมนู" (§15.2.4) */
export function BottomNav({ role }: { role: Role }) {
  const items = groupsFor(role).flatMap(g => g.items);
  const activeHref = useActiveHref(items);
  const pathname = usePathname();
  const tabs = items.filter(i => i.primary).slice(0, 4);
  return (
    <nav aria-label="เมนูหลังบ้าน" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur md:hidden print:hidden">
      {tabs.map(({ href, label, short, icon: Icon }) => (
        <Link key={href} href={href} aria-current={href === activeHref ? 'page' : undefined} className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-accent">
          <Icon aria-hidden className="size-[22px]" />
          {short ?? label}
        </Link>
      ))}
      <Link href="/agent/menu" aria-current={pathname === '/agent/menu' || (activeHref !== undefined && !tabs.some(t => t.href === activeHref)) ? 'page' : undefined} className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted aria-[current=page]:text-accent">
        <LayoutGrid aria-hidden className="size-[22px]" />
        เมนู
      </Link>
    </nav>
  );
}

/** หน้ารวมเมนูของมือถือ แบ่งตามโซน */
export function MoreMenu({ role }: { role: Role }) {
  return (
    <div className="flex flex-col gap-5">
      {groupsFor(role).map(g => (
        <section key={g.id} aria-labelledby={`menu-${g.id}`}>
          <h2 id={`menu-${g.id}`} className="mb-2 flex items-center gap-2.5 font-semibold">
            <span aria-hidden className={`grid size-8 place-items-center rounded-[10px] border ${TONE[g.tone]}`}><g.icon className="size-[17px]" /></span>
            {g.label}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {g.items.map(({ href, label, icon: Icon }) => (
              <li key={href} className="border-b border-line last:border-0">
                <Link href={href} className="flex min-h-14 items-center gap-3 px-4 font-medium hover:bg-surface-2">
                  <Icon aria-hidden className="size-5 text-muted" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight aria-hidden className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Link href="/" className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 font-medium"><BookUser aria-hidden className="size-5 text-muted" />ดูหน้าเว็บสาธารณะ</Link>
    </div>
  );
}
