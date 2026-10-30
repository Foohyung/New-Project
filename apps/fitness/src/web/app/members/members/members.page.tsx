import { formatThaiDate, formatThaiDateOf, formatThaiMobile, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { ArrowDownWideNarrow, CalendarClock, Columns3, Dumbbell, History, LayoutGrid, Package, Search, Sparkles, Table2, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { DateRangeFilter } from '@/web/components/ui/ui/ui.date-range-filter';
import { Avatar, btn, Forbidden, StatusBadge } from '@/web/components/ui/ui/ui';
import { parseRange } from '@/api/services/shared/shared/shared.date-range';
import { UrlDropdown } from '@/web/components/ui/ui/ui.url-dropdown';
import { hrefWith, Toolbar, ViewSwitch } from '@/web/components/ui/ui/ui.view-switch';
import { MEMBER_SORT_LABEL, STATUS_LABEL, type MemberSort, type MembershipStatus } from '@/api/services/members/members/members.service';
import type { MemberDto } from '@/api/types/members/members/members.types';
import { today } from '@/api/lib/clock/clock/clock';
import { canDeleteMember, countByStatus, listMembers } from '@/api/dal/members/members/members.dal';
import { deleteMemberAction } from '@/api/actions/members/members/members.actions';
import { MemberRowActions } from '@/web/components/members/members/members.row-actions';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { can } from '@/api/lib/auth/auth/auth.rbac';

export const metadata: Metadata = { title: 'สมาชิก' };

const VIEWS = ['table', 'cards', 'board'] as const;

const SearchParams = z.object({
  status: z.enum(['active', 'expiring', 'expired', 'frozen']).optional().catch(undefined),
  q: z.string().trim().max(40).optional().catch(undefined),
  view: z.enum(VIEWS).catch('table'),
  sort: z.enum(['expires', 'name', 'recent', 'newest']).catch('expires'),
  pkg: z.string().max(20).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

const TABS = [undefined, 'active', 'expiring', 'frozen', 'expired'] as const;
const BOARD: MembershipStatus[] = ['active', 'expiring', 'frozen', 'expired'];

const VIEW_OPTIONS = [
  { value: 'table', label: 'ตาราง', icon: <Table2 className="size-4" /> },
  { value: 'cards', label: 'การ์ด', icon: <LayoutGrid className="size-4" /> },
  { value: 'board', label: 'บอร์ดสถานะ', icon: <Columns3 className="size-4" /> },
];

const SORT_ICON: Record<MemberSort, ReactNode> = {
  expires: <CalendarClock className="size-4" />,
  name: <ArrowDownWideNarrow className="size-4" />,
  recent: <History className="size-4" />,
  newest: <Sparkles className="size-4" />,
};

const BAR: Record<MembershipStatus, string> = { active: 'bg-lime', expiring: 'bg-warn', expired: 'bg-danger', frozen: 'bg-violet' };
const DOT: Record<MembershipStatus, string> = BAR;

const daysText = (m: MemberDto) => (m.status === 'frozen' ? 'พักสมาชิกอยู่' : m.daysLeft >= 0 ? `เหลือ ${String(m.daysLeft)} วัน` : `เลยมา ${String(-m.daysLeft)} วัน`);
const lastCheckIn = (m: MemberDto) => (m.lastCheckInAt ? `${formatThaiDateOf(m.lastCheckInAt)} ${formatThaiTime(m.lastCheckInAt)}` : '—');

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('members.view');
  if (!allowed) return <Forbidden />;
  const { status, q, view, sort, pkg, from, to } = SearchParams.parse(await searchParams);
  const expires = parseRange({ from, to }, today());
  const [rows, counts, packages] = await Promise.all([listMembers(session, { status, q, sort, packageId: pkg, expires }), countByStatus(session), listPackages(session)]);
  // ค่าที่ไม่ใช่ค่าเริ่มต้นเท่านั้นที่อยู่ใน URL
  const current = { status, q, pkg, view: view === 'table' ? undefined : view, sort: sort === 'expires' ? undefined : sort, from: expires?.from, to: expires?.to };
  const href = (patch: Record<string, string | undefined>) => hrefWith('/members', current, patch);

  return (
    <>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{session.branch}</p>
          <h1 className="font-display text-2xl font-semibold lg:text-[28px]">สมาชิก</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form method="get" role="search" className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-muted md:w-96">
            {Object.entries(current).map(([key, value]) => (key !== 'q' && value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
            <Search aria-hidden className="size-5 shrink-0" />
            <label htmlFor="q" className="sr-only">ค้นหาชื่อ เบอร์โทร หรือรหัสสมาชิก</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="ชื่อ เบอร์โทร หรือรหัสสมาชิก" className="min-h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint" />
          </form>
          {can(session, 'members.manage') && (
            <Link href="/members/new" className={`${btn.primary} min-h-12`}><UserPlus aria-hidden className="size-5" />สมัครสมาชิก</Link>
          )}
        </div>
      </header>

      <nav aria-label="กรองตามสถานะ" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <Link
            key={tab ?? 'all'}
            href={href({ status: tab })}
            aria-current={status === tab ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg"
          >
            {tab ? STATUS_LABEL[tab] : 'ทั้งหมด'}
            <span className="rounded-full bg-black/20 px-2 text-xs">{counts[tab ?? 'all']}</span>
          </Link>
        ))}
      </nav>

      <DateRangeFilter path="/members" params={current} range={expires} today={today()} label="วันหมดอายุ" allowAll future />

      <Toolbar>
        <ViewSwitch views={VIEW_OPTIONS} current={view} hrefFor={v => href({ view: v === 'table' ? undefined : v })} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <UrlDropdown
            label="แพ็กเกจ"
            value={pkg ?? ''}
            options={[
              { value: '', label: 'ทุกแพ็กเกจ', icon: <Package className="size-4" />, href: href({ pkg: undefined }) },
              ...packages.map(p => ({ value: p.id, label: p.name, description: p.durationLabel, icon: <Package className="size-4" />, href: href({ pkg: p.id }) })),
            ]}
          />
          <UrlDropdown
            label="เรียงตาม"
            align="end"
            value={sort}
            options={(Object.keys(MEMBER_SORT_LABEL) as MemberSort[]).map(s => ({ value: s, label: MEMBER_SORT_LABEL[s], icon: SORT_ICON[s], href: href({ sort: s === 'expires' ? undefined : s }) }))}
          />
        </div>
      </Toolbar>

      <p className="-mt-2 text-sm text-muted" aria-live="polite">แสดง {rows.length} คน</p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">ไม่พบสมาชิกที่ตรงกับเงื่อนไข ลองค้นด้วยคำอื่นหรือเลือก &quot;ทั้งหมด&quot;</p>
      ) : view === 'cards' ? (
        <CardsView rows={rows} />
      ) : view === 'board' ? (
        <BoardView rows={rows} />
      ) : (
        <TableView rows={rows} canEdit={can(session, 'members.manage')} canDelete={canDeleteMember(session)} />
      )}
    </>
  );
}

/** ตาราง: แท็บเล็ตขึ้นไปเป็นตารางพร้อมคอลัมน์แรก sticky ส่วนมือถือเป็นการ์ด (§15.2.4) */
function TableView({ rows, canEdit, canDelete }: { rows: MemberDto[]; canEdit: boolean; canDelete: boolean }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map(m => (
          <li key={m.id} className="relative rounded-2xl border border-line bg-surface p-4 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <Link href={`/members/${m.id}`} className="tap block truncate font-medium outline-none after:absolute after:inset-0">{m.name}</Link>
                <small className="text-xs text-muted">{m.code} · {formatThaiMobile(m.phone)}</small>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-xs text-faint">แพ็กเกจ</dt><dd>{m.packageName}</dd></div>
              <div><dt className="text-xs text-faint">หมดอายุ</dt><dd>{formatThaiDate(m.expiresOn)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="text-xs text-faint">
            <tr>
              <th scope="col" className="sticky left-0 bg-surface px-5 py-3 font-medium">สมาชิก</th>
              <th scope="col" className="px-5 py-3 font-medium">แพ็กเกจ</th>
              <th scope="col" className="px-5 py-3 font-medium">หมดอายุ</th>
              <th scope="col" className="px-5 py-3 font-medium">เช็กอินล่าสุด</th>
              <th scope="col" className="w-px whitespace-nowrap px-5 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="ff-stagger divide-y divide-line">
            {rows.map(m => (
              <tr key={m.id} className="hover:bg-surface-2/50">
                <th scope="row" className="sticky left-0 bg-surface px-5 py-3 text-left font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} />
                    <div>
                      <Link href={`/members/${m.id}`} className="tap block font-medium hover:text-lime hover:underline">{m.name}</Link>
                      <small className="text-xs text-muted">{m.code} · {formatThaiMobile(m.phone)}</small>
                    </div>
                  </div>
                </th>
                <td className="px-5 py-3">{m.packageName}</td>
                <td className="px-5 py-3">
                  {formatThaiDate(m.expiresOn)}
                  <small className="block text-xs text-muted">{daysText(m)}</small>
                </td>
                <td className="px-5 py-3 text-muted">{lastCheckIn(m)}</td>
                <td className="w-px whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    <MemberRowActions id={m.id} name={m.name} canEdit={canEdit} deleteAction={canDelete ? deleteMemberAction.bind(null, m.id, false) : undefined} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** การ์ด: ดูภาพรวมทีละคนพร้อมแถบวันคงเหลือ (เทียบกับ 30 วัน) */
function CardsView({ rows }: { rows: MemberDto[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map(m => {
        const pct = m.status === 'frozen' ? 100 : Math.max(0, Math.min(100, (m.daysLeft / 30) * 100));
        return (
          <li key={m.id} className="relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-muted has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime sm:p-5">
            <div className="flex items-start gap-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <Link href={`/members/${m.id}`} className="tap block truncate font-semibold outline-none after:absolute after:inset-0">{m.name}</Link>
                <small className="text-xs text-muted">{m.code}</small>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <b className="font-display text-xl font-semibold">{daysText(m)}</b>
                <span className="text-xs text-muted">ถึง {formatThaiDate(m.expiresOn)}</span>
              </div>
              <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String(pct)}%` }} className={`block h-full rounded-full ${BAR[m.status]}`} /></span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-sm">
              <div className="min-w-0"><dt className="text-xs text-faint">แพ็กเกจ</dt><dd className="truncate">{m.packageName}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-faint">PT คงเหลือ</dt><dd className="flex items-center gap-1"><Dumbbell aria-hidden className="size-3.5 text-muted" />{m.ptSessionsLeft} ครั้ง</dd></div>
              <div className="col-span-2 min-w-0"><dt className="text-xs text-faint">เช็กอินล่าสุด</dt><dd className="text-muted">{lastCheckIn(m)}</dd></div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

/** บอร์ดตามสถานะ: เห็นงานต่ออายุ/ติดตามเป็นคอลัมน์ */
function BoardView({ rows }: { rows: MemberDto[] }) {
  return (
    <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BOARD.map(s => {
        const items = rows.filter(m => m.status === s);
        return (
          <section key={s} aria-labelledby={`board-${s}`} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface/60 p-3">
            <h2 id={`board-${s}`} className="flex items-center gap-2 px-1 py-1 font-semibold">
              <span aria-hidden className={`size-2.5 rounded-full ${DOT[s]}`} />
              {STATUS_LABEL[s]}
              <span className="ml-auto rounded-full bg-surface-2 px-2 text-xs text-muted">{items.length}</span>
            </h2>
            {items.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-faint">ไม่มีสมาชิก</p> : (
              <ul className="flex flex-col gap-2">
                {items.map(m => (
                  <li key={m.id} className="relative flex items-center gap-3 rounded-xl border border-line bg-bg p-3 hover:border-muted has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime">
                    <Avatar name={m.name} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${m.id}`} className="tap block truncate text-sm font-medium outline-none after:absolute after:inset-0">{m.name}</Link>
                      <small className="block truncate text-xs text-muted">{m.packageName} · {daysText(m)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
