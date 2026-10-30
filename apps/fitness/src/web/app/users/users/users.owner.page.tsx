import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { addOwnerBranchAction, deleteManagedUserAction, removeOwnerBranchAction } from '@/api/actions/users/users/users.actions';
import { getOwnerDetail } from '@/api/dal/users/users/users.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { today } from '@/api/lib/clock/clock/clock';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Badge, Card, EmptyState, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { OwnerBranchForm } from '@/web/components/users/users/users.form';
import { UserRowActions } from '@/web/components/users/users/users.row-actions';
import { UserStatusBadge } from '@/web/components/users/users/users.status';

export const metadata: Metadata = { title: 'สาขาของเจ้าของ' };

/** (admin) เจ้าของคนนี้ดูแลสาขาไหนบ้าง และแต่ละสาขามีพนักงานคนไหน */
export default async function OwnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('users.manage');
  if (!allowed || session.role !== 'admin') return <Forbidden />;
  const { id } = await params;
  const detail = await getOwnerDetail(session, id);
  if (!detail) notFound();
  const { owner, branches } = detail;
  const staffCount = branches.reduce((sum, b) => sum + b.staff.length, 0);
  const day = today();
  const here = `/users/${encodeURIComponent(owner.id)}`;

  return (
    <>
      <PageHeader
        back={{ href: '/users', label: 'บัญชีผู้ใช้' }}
        kicker={`เจ้าของ · ${owner.login}`}
        title={owner.name}
        actions={<UserRowActions id={owner.id} name={owner.name} back={here} />}
      />

      <Card title="สาขาที่ดูแล" subtitle={`${String(branches.length)} สาขา · พนักงาน ${String(staffCount)} คน`}>
        <nav aria-label="ไปยังสาขา" className="flex flex-wrap gap-2">
          {branches.map(b => (
            <a key={b.branch} href={`#branch-${encodeURIComponent(b.branch)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted hover:border-lime hover:text-ink">
              {b.branch}
              {b.home && <Badge tone="lime">สาขาหลัก</Badge>}
              <span className="rounded-full bg-black/20 px-2 text-xs">{b.staff.length}</span>
            </a>
          ))}
        </nav>
        <div className="mt-4 border-t border-line pt-4">
          <OwnerBranchForm action={addOwnerBranchAction.bind(null, owner.id)} />
        </div>
      </Card>

      {branches.map(b => (
        <section key={b.branch} id={`branch-${encodeURIComponent(b.branch)}`} className="scroll-mt-20">
          <Card
            title={b.branch}
            subtitle={`พนักงาน ${String(b.staff.length)} คน`}
            action={b.home ? <Badge tone="lime">สาขาหลัก</Badge> : (
              <ActionButton
                action={removeOwnerBranchAction.bind(null, owner.id, b.branch)}
                label="เอาสาขานี้ออก"
                pendingLabel="กำลังเอาออก…"
                variant="ghost"
                confirm={`เอา${b.branch}ออกจากเจ้าของ ${owner.name}? บัญชีพนักงานในสาขานี้ยังอยู่ แต่เจ้าของคนนี้จะไม่เห็นอีก`}
              />
            )}
          >
            {b.staff.length === 0 ? <EmptyState>ยังไม่มีพนักงานในสาขานี้</EmptyState> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-muted"><tr><th className="px-3 py-2">ชื่อ</th><th className="px-3 py-2">ข้อมูลเข้าสู่ระบบ</th><th className="px-3 py-2">บทบาท</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {b.staff.map(user => (
                      <tr key={user.id}>
                        <td className="px-3 py-3"><b className="block">{user.name}</b><span className="text-xs text-muted">{user.nickname}</span></td>
                        <td className="px-3 py-3">{user.login}</td>
                        <td className="px-3 py-3">{user.roleName}</td>
                        <td className="w-px whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <UserStatusBadge user={user} today={day} />
                            <UserRowActions id={user.id} name={user.name} back={here} deleteAction={deleteManagedUserAction.bind(null, user.id, null)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      ))}
    </>
  );
}
