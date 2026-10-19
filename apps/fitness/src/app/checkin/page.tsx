import type { Metadata } from 'next';
import { CheckInForm } from '@/components/checkin-form';
import { LiveFeed } from '@/components/dashboard';
import { Forbidden, PageHeader } from '@/components/ui';
import { recentCheckIns } from '@/server/dal/members';
import { pageGuard } from '@/server/guard';

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
