import { formatThaiDate, formatThaiDateOf, formatThaiMobile, formatThaiTime } from '@repo/utils';
import { Search, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { Avatar, btn, Forbidden, StatusBadge } from '@/components/ui';
import { STATUS_LABEL } from '@/features/members/service';
import { countByStatus, listMembers } from '@/server/dal/members';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'สมาชิก' };

const SearchParams = z.object({
  status: z.enum(['active', 'expiring', 'expired', 'frozen']).optional().catch(undefined),
  q: z.string().trim().max(40).optional().catch(undefined),
});

const TABS = [undefined, 'active', 'expiring', 'frozen', 'expired'] as const;

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('members.view');
  if (!allowed) return <Forbidden />;
  const { status, q } = SearchParams.parse(await searchParams);
  const [rows, counts] = await Promise.all([listMembers(session, { status, q }), countByStatus(session)]);
  const href = (s?: string) => {
    const params = new URLSearchParams();
    if (s) params.set('status', s);
    if (q) params.set('q', q);
    const query = params.toString();
    return query ? `/members?${query}` : '/members';
  };

  return (
    <>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{session.branch}</p>
          <h1 className="font-display text-2xl font-semibold lg:text-[28px]">สมาชิก</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form method="get" role="search" className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-muted md:w-96">
            {status && <input type="hidden" name="status" value={status} />}
            <Search aria-hidden className="size-5 shrink-0" />
            <label htmlFor="q" className="sr-only">ค้นหาชื่อ เบอร์โทร หรือรหัสสมาชิก</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="ชื่อ เบอร์โทร หรือรหัสสมาชิก" className="min-h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint" />
          </form>
          {can(session, 'members.manage') && (
            <Link href="/members/new" className={`${btn.primary} min-h-12`}><UserPlus aria-hidden className="size-5" />สมัครสมาชิก</Link>
          )}
        </div>
      </header>

      <nav aria-label="กรองตามสถานะ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <Link
            key={tab ?? 'all'}
            href={href(tab)}
            aria-current={status === tab ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg"
          >
            {tab ? STATUS_LABEL[tab] : 'ทั้งหมด'}
            <span className="rounded-full bg-black/20 px-2 text-xs">{counts[tab ?? 'all']}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">ไม่พบสมาชิกที่ตรงกับเงื่อนไข ลองค้นด้วยคำอื่นหรือเลือก &quot;ทั้งหมด&quot;</p>
      ) : (
        <>
          {/* มือถือ: การ์ด (§15.2.4) */}
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

          {/* แท็บเล็ตขึ้นไป: ตาราง + คอลัมน์แรก sticky */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="text-xs text-faint">
                <tr>
                  <th scope="col" className="sticky left-0 bg-surface px-5 py-3 font-medium">สมาชิก</th>
                  <th scope="col" className="px-5 py-3 font-medium">แพ็กเกจ</th>
                  <th scope="col" className="px-5 py-3 font-medium">หมดอายุ</th>
                  <th scope="col" className="px-5 py-3 font-medium">เช็กอินล่าสุด</th>
                  <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(m => (
                  <tr key={m.id}>
                    <th scope="row" className="sticky left-0 bg-surface px-5 py-3 text-left font-normal">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <div>
                          <Link href={`/members/${m.id}`} className="tap block font-medium hover:underline">{m.name}</Link>
                          <small className="text-xs text-muted">{m.code} · {formatThaiMobile(m.phone)}</small>
                        </div>
                      </div>
                    </th>
                    <td className="px-5 py-3">{m.packageName}</td>
                    <td className="px-5 py-3">
                      {formatThaiDate(m.expiresOn)}
                      <small className="block text-xs text-muted">{m.daysLeft >= 0 ? `เหลือ ${String(m.daysLeft)} วัน` : `เลยมา ${String(-m.daysLeft)} วัน`}</small>
                    </td>
                    <td className="px-5 py-3 text-muted">{m.lastCheckInAt ? `${formatThaiDateOf(m.lastCheckInAt)} ${formatThaiTime(m.lastCheckInAt)}` : '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
