import type { Metadata } from 'next';
import { MemberCreateForm } from '@/components/member-forms';
import { Forbidden, PageHeader } from '@/components/ui';
import { createMemberAction } from '@/features/members/actions';
import { today } from '@/server/clock';
import { listPackages } from '@/server/dal/packages';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'สมัครสมาชิก' };

export default async function NewMemberPage() {
  const { session, allowed } = await pageGuard('members.manage');
  if (!allowed) return <Forbidden />;
  const packages = await listPackages(session, { activeOnly: true });
  return (
    <>
      <PageHeader back={{ href: '/members', label: 'สมาชิก' }} kicker={session.branch} title="สมัครสมาชิกใหม่" />
      <MemberCreateForm packages={packages} action={createMemberAction} today={today()} />
    </>
  );
}
