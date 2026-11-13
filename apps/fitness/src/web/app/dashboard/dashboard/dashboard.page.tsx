import { formatThaiDate, formatThaiDateTime, thaiGreeting } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ClassesToday, ExpiringList, HourlyChart, KpiGrid, LiveFeed, PackageMix, Topbar } from '@/web/components/dashboard/dashboard/dashboard';
import { now, today } from '@/api/lib/clock/clock/clock';
import { getDashboard, getDashboardBranchScope } from '@/api/dal/dashboard/dashboard/dashboard.dal';
import { listMembers, recentCheckIns } from '@/api/dal/members/members/members.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { UrlDropdown } from '@/web/components/ui/ui/ui.url-dropdown';

export const metadata: Metadata = { title: 'แดชบอร์ด' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('dashboard.view');
  // เทรนเนอร์ไม่มีแดชบอร์ด → เริ่มที่ตารางคลาส
  if (!allowed) redirect('/classes');
  const requestedBranch = (await searchParams).branch;
  const branchContext = session.role === 'admin'
    ? await getDashboardBranchScope(session, typeof requestedBranch === 'string' ? requestedBranch : undefined)
    : null;
  const scope = branchContext?.scope;
  const creatorIds = scope?.creatorIds ?? undefined;
  const [data, feed, expiring] = await Promise.all([
    getDashboard(session, scope),
    recentCheckIns(session, 6, creatorIds),
    listMembers(session, { status: 'expiring', ...(creatorIds ? { createdByIds: creatorIds } : {}) }),
  ]);
  const instant = now();

  return (
    <>
      <Topbar dateText={`${formatThaiDateTime(instant)} · ${scope?.branch ?? (session.role === 'admin' ? 'ทุกสาขา' : session.branch)}`} greeting={`${thaiGreeting(instant)}, คุณ${session.nickname}`} />
      {branchContext && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">ภาพรวมสาขา</p>
            <p className="text-xs text-muted">เลือกดูข้อมูลรวม หรือเจาะจงรายสาขา</p>
          </div>
          <UrlDropdown
            label="สาขา"
            value={scope?.branch ?? '__all__'}
            options={[
              { value: '__all__', label: 'ทุกสาขา', href: '/dashboard' },
              ...branchContext.branches.map(branch => ({
                value: branch,
                label: branch,
                href: `/dashboard?branch=${encodeURIComponent(branch)}`,
              })),
            ]}
          />
        </div>
      )}
      <KpiGrid data={data} dateLabel={formatThaiDate(today())} />
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1.7fr_1fr]">
        <HourlyChart hourly={data.hourly} currentHour={data.currentHour} />
        <LiveFeed items={feed} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 2xl:grid-cols-[1fr_1.3fr_1fr]">
        <ClassesToday classes={data.classes} />
        <ExpiringList members={expiring} />
        <PackageMix mix={data.packageMix} />
      </div>
    </>
  );
}
