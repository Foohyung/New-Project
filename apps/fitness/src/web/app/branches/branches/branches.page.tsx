import type { Metadata } from 'next';
import { createBranchAction, deleteBranchAction } from '@/api/actions/branches/branches/branches.actions';
import { listBranches } from '@/api/dal/branches/branches/branches.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatThaiDateOf, formatThaiMobile } from '@/api/lib/utils/utils/utils';
import { AddBranchButton, BranchRowActions } from '@/web/components/branches/branches/branches.forms';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'สาขา' };

/** (admin เท่านั้น) เพิ่ม แก้ไข และลบสาขา — ชื่อสาขาที่นี่คือรายการที่ใช้เลือกตอนเพิ่มบัญชีผู้ใช้ */
export default async function BranchesPage() {
  const { session, allowed } = await pageGuard('branches.manage');
  if (!allowed || session.role !== 'admin') return accessDenied();
  const branches = await listBranches(session);
  const active = branches.filter(b => b.active).length;

  return (
    <>
      <PageHeader kicker="จัดการโดย admin เท่านั้น" title="สาขา" />
      <Card title="สาขาทั้งหมด" subtitle={`${String(branches.length)} สาขา · เปิดใช้งาน ${String(active)} สาขา · สาขาที่มีบัญชีผู้ใช้อยู่ลบไม่ได้`}>
        {branches.length === 0 ? <EmptyState>ยังไม่มีสาขา กดปุ่ม + มุมขวาล่างเพื่อเพิ่ม</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-3 py-2">สาขา</th><th className="px-3 py-2">เบอร์โทร</th><th className="px-3 py-2">บัญชีผู้ใช้</th><th className="px-3 py-2">แก้ไขล่าสุด</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {branches.map(b => (
                  <tr key={b.id}>
                    <td className="px-3 py-3"><b className="block">{b.name}</b>{b.address && <span className="text-xs text-muted">{b.address}</span>}</td>
                    <td className="px-3 py-3">{b.phone ? formatThaiMobile(b.phone) : '—'}</td>
                    <td className="px-3 py-3">{b.userCount} บัญชี</td>
                    <td className="px-3 py-3 text-muted">{formatThaiDateOf(b.updatedAt)}{b.updatedByName && ` · ${b.updatedByName}`}</td>
                    <td className="w-px whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={b.active ? 'lime' : 'muted'}>{b.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge>
                        <BranchRowActions id={b.id} name={b.name} deleteAction={b.userCount === 0 ? deleteBranchAction.bind(null, b.id, false) : undefined} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddBranchButton action={createBranchAction} />
      </Card>
    </>
  );
}
