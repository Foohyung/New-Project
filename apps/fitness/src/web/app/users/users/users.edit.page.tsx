import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deleteManagedUserAction, updateManagedUserAction } from '@/api/actions/users/users/users.actions';
import { getManagedUser, listUserOptions } from '@/api/dal/users/users/users.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { today } from '@/api/lib/clock/clock/clock';
import { Card, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { ManagedUserForm } from '@/web/components/users/users/users.form';
import { DeleteUserButton } from '@/web/components/users/users/users.row-actions';

export const metadata: Metadata = { title: 'แก้ไขบัญชีผู้ใช้' };

/** (admin) แก้ไขหรือลบบัญชี · ?back= = หน้าที่กดมา (กลับไปหลังลบ) */
export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('users.manage');
  if (!allowed || session.role !== 'admin') return <Forbidden />;
  const { id } = await params;
  const requested = (await searchParams).back;
  const back = typeof requested === 'string' && requested.startsWith('/users') ? requested : '/users';
  const [user, options] = await Promise.all([getManagedUser(session, id), listUserOptions(session, id)]);
  if (!user) notFound();
  const self = user.id === session.userId;

  return (
    <>
      <PageHeader back={{ href: back, label: back === '/users' ? 'บัญชีผู้ใช้' : 'เจ้าของ' }} kicker={`${user.roleName} · ${user.branch}`} title={`แก้ไข ${user.name}`} />
      <Card title="ข้อมูลบัญชี" subtitle={self ? 'บัญชีของคุณเอง — เปลี่ยนบทบาท ปิดใช้งาน หรือตั้งช่วงวันที่ไม่ได้' : 'รหัสผ่านเว้นว่าง = ใช้รหัสเดิม'}>
        <ManagedUserForm branch={user.branch} options={options} canManageRoles action={updateManagedUserAction.bind(null, user.id)} today={today()} user={user} />
      </Card>
      {!self && (
        <Card title="ลบบัญชี" subtitle="ลบถาวร ย้อนกลับไม่ได้ — ถ้าแค่ไม่ให้เข้าระบบชั่วคราว ให้ปิดใช้งานหรือตั้ง active to แทน">
          <DeleteUserButton name={user.name} action={deleteManagedUserAction.bind(null, user.id, back)} />
        </Card>
      )}
    </>
  );
}
