import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createRoleAction, deleteRoleAction, updateRoleAction } from '@/api/actions/roles/roles/roles.actions';
import { listRoleDefinitions } from '@/api/dal/roles/roles/roles.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { PERMISSION_LABEL } from '@/api/services/auth/auth/auth.roles';
import { RoleEditorForm, DeleteRoleForm, RolePermissionLegend } from '@/web/components/roles/roles/roles.forms';
import { Badge, btn, Card, EmptyState, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'บทบาทและสิทธิ์' };

/** ค่า ?role= สำหรับฟอร์มสร้าง role ใหม่ */
const NEW = 'new';
const TAB = 'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg';

/** เลือก role ก่อน (แท็บด้านบน) แล้วแสดงข้อมูลและฟอร์มแก้ไขเฉพาะ role นั้น · ปุ่ม "เพิ่ม role" เปิดฟอร์มสร้างใหม่ */
export default async function RolesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('roles.manage');
  if (!allowed || session.role !== 'admin') return <Forbidden />;
  const roles = await listRoleDefinitions(session);
  const requested = (await searchParams).role;
  const wanted = typeof requested === 'string' ? requested : undefined;
  const creating = wanted === NEW;
  const role = creating ? undefined : (roles.find(r => r.id === wanted) ?? roles[0]);

  return (
    <>
      <PageHeader
        kicker="จัดการโดย admin เท่านั้น"
        title="บทบาทและสิทธิ์"
        actions={
          <Link href={`/roles?role=${NEW}`} aria-current={creating ? 'page' : undefined} className={btn.primary}>
            <Plus aria-hidden className="size-5" />
            เพิ่ม role
          </Link>
        }
      />

      <nav aria-label="เลือก role" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {roles.map(r => (
          <Link key={r.id} href={`/roles?role=${encodeURIComponent(r.id)}`} aria-current={r.id === role?.id ? 'page' : undefined} className={TAB}>
            {r.name}
            <span className="rounded-full bg-black/20 px-2 text-xs">{r.userCount}</span>
          </Link>
        ))}
      </nav>

      {creating ? (
        <Card title="สร้าง role ใหม่" subtitle="กำหนดเมนูและสิทธิ์การทำงานให้พนักงาน">
          <div className="mb-4"><RolePermissionLegend /></div>
          <RoleEditorForm createAction={createRoleAction} updateAction={updateRoleAction} />
        </Card>
      ) : !role ? (
        <Card title="role ในระบบ"><EmptyState>ยังไม่มี role</EmptyState></Card>
      ) : (
        <Card
          title={role.name}
          action={<Badge tone={role.system ? 'cyan' : 'lime'}>{role.system ? 'role ระบบ' : 'custom role'}</Badge>}
          subtitle={`${role.id} · ${String(role.userCount)} บัญชี · ${String(role.permissions.length)} สิทธิ์`}
        >
          {role.id === 'admin' ? (
            <p className="rounded-xl border border-line bg-bg p-3 text-sm text-muted">role admin ได้รับการป้องกันเพื่อไม่ให้สูญเสียสิทธิ์ผู้ดูแลระบบ และไม่สามารถแก้ไขหรือลบได้</p>
          ) : (
            <div className="flex flex-col gap-4">
              <RolePermissionLegend />
              {/* key = role.id ให้ฟอร์มเริ่มค่าใหม่เมื่อสลับแท็บ */}
              <RoleEditorForm key={role.id} role={role} createAction={createRoleAction} updateAction={updateRoleAction} />
              {role.system ? <p className="text-xs text-muted">role ระบบแก้ไขชื่อและสิทธิ์ได้ แต่ลบไม่ได้</p> : <DeleteRoleForm roleId={role.id} action={deleteRoleAction} />}
            </div>
          )}
          {role.permissions.length > 0 && (
            <details className="mt-4">
              <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-muted">ดูสิทธิ์ปัจจุบัน</summary>
              <ul className="flex flex-wrap gap-2">
                {role.permissions.map(permission => <li key={permission}><Badge>{PERMISSION_LABEL[permission]}</Badge></li>)}
              </ul>
            </details>
          )}
        </Card>
      )}
    </>
  );
}
