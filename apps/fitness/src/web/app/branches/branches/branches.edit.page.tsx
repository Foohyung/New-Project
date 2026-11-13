import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deleteBranchAction, updateBranchAction } from '@/api/actions/branches/branches/branches.actions';
import { getBranch } from '@/api/dal/branches/branches/branches.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { BranchEditForm, DeleteBranchButton } from '@/web/components/branches/branches/branches.forms';
import { Card, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'แก้ไขสาขา' };

/** (admin เท่านั้น) แก้ไขหรือลบสาขา */
export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('branches.manage');
  if (!allowed || session.role !== 'admin') return accessDenied();
  const branch = await getBranch(session, (await params).id);
  if (!branch) notFound();

  return (
    <>
      <PageHeader back={{ href: '/branches', label: 'สาขา' }} kicker={`${String(branch.userCount)} บัญชีผู้ใช้ในสาขานี้`} title={`แก้ไข ${branch.name}`} />
      <Card title="ข้อมูลสาขา">
        <BranchEditForm branch={branch} action={updateBranchAction} />
      </Card>
      <Card title="ลบสาขา" subtitle={branch.userCount > 0 ? 'ยังลบไม่ได้ — ย้ายบัญชีผู้ใช้ในสาขานี้ไปสาขาอื่นก่อน หรือปิดใช้งานสาขาแทน' : 'ลบถาวร ย้อนกลับไม่ได้ — ถ้าแค่ไม่ใช้ชั่วคราว ให้ปิดใช้งานแทน'}>
        {branch.userCount === 0 && <DeleteBranchButton name={branch.name} action={deleteBranchAction.bind(null, branch.id, true)} />}
      </Card>
    </>
  );
}
