import type { Metadata } from 'next';
import { MemberCreateForm } from '@/web/components/members/members/members.forms';
import { Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { createMemberAction } from '@/api/actions/members/members/members.actions';
import { today } from '@/api/lib/clock/clock/clock';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

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
