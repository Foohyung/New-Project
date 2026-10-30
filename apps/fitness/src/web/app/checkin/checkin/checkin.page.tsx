import type { Metadata } from 'next';
import { CheckInForm } from '@/web/components/checkin/checkin/checkin.form';
import { LiveFeed } from '@/web/components/dashboard/dashboard/dashboard';
import { Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { recentCheckIns } from '@/api/dal/members/members/members.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'เช็กอิน' };

export default async function CheckInPage() {
  const { session, allowed } = await pageGuard('checkin.use');
  if (!allowed) return <Forbidden />;
  const feed = await recentCheckIns(session, 8);
  return (
    <>
      <PageHeader kicker={`${session.branch} · เคาน์เตอร์`} title="เช็กอิน" />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-5">
        <CheckInForm />
        <LiveFeed items={feed} />
      </div>
    </>
  );
}
