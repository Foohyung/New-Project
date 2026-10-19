import { formatThaiDate, formatThaiDateTime, thaiGreeting } from '@repo/utils';
import { redirect } from 'next/navigation';
import { ClassesToday, ExpiringList, HourlyChart, KpiGrid, LiveFeed, PackageMix, Topbar } from '@/components/dashboard';
import { now, today } from '@/server/clock';
import { getDashboard } from '@/server/dal/dashboard';
import { listMembers, recentCheckIns } from '@/server/dal/members';
import { pageGuard } from '@/server/guard';

export default async function DashboardPage() {
  const { session, allowed } = await pageGuard('dashboard.view');
  // เทรนเนอร์ไม่มีแดชบอร์ด → เริ่มที่ตารางคลาส
  if (!allowed) redirect('/classes');
  const [data, feed, expiring] = await Promise.all([getDashboard(session), recentCheckIns(session, 6), listMembers(session, { status: 'expiring' })]);
  const instant = now();

  return (
    <>
      <Topbar dateText={`${formatThaiDateTime(instant)} · ${session.branch}`} greeting={`${thaiGreeting(instant)}, คุณ${session.nickname}`} />
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
