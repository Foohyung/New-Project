import type { Metadata } from 'next';
import { MemberCreateForm } from '@/web/components/members/members/members.forms';
import { PageHeader } from '@/web/components/ui/ui/ui';
import { createMemberAction } from '@/api/actions/members/members/members.actions';
import { today } from '@/api/lib/clock/clock/clock';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';

export const metadata: Metadata = { title: 'สมัครสมาชิก' };

export default async function NewMemberPage() {
  const { session, allowed } = await pageGuard('members.manage');
  if (!allowed) return accessDenied();
  const [packages, setup] = await Promise.all([listPackages(session, { activeOnly: true }), paymentSetupForBranch(session.branch)]);
  return (
    <>
      <PageHeader back={{ href: '/members', label: 'สมาชิก' }} kicker={session.branch} title="สมัครสมาชิกใหม่" />
      <MemberCreateForm packages={packages} action={createMemberAction} today={today()} setup={setup} />
    </>
  );
}
