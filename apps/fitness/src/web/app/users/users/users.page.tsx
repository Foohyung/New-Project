import type { Metadata } from 'next';
import Link from 'next/link';
import { createManagedUserAction, deleteManagedUserAction, resolvePasswordResetAction } from '@/api/actions/users/users/users.actions';
import { listBranches, listManagedUsers, listOwnerSummaries, listPasswordResetRequests, listUserOptions } from '@/api/dal/users/users/users.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { ManagedUserForm } from '@/web/components/users/users/users.form';
import { UserRowActions } from '@/web/components/users/users/users.row-actions';
import { UserStatusBadge } from '@/web/components/users/users/users.status';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { formatThaiDateOf, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { today } from '@/api/lib/clock/clock/clock';
import { Card, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { EmptyState } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'บัญชีผู้ใช้' };

const TAB = 'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg';

/**
 * admin เห็นเฉพาะบัญชี admin และเจ้าของ — กดรูปดวงตาท้ายแถวเจ้าของเพื่อดูสาขาและพนักงาน (/users/[id])
 * เจ้าของเห็นพนักงานในสาขาที่ดูแล (ดูแลหลายสาขามีแท็บเลือกสาขา) · DAL บังคับขอบเขตเสมอ
 */
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('users.manage');
  if (!allowed) return <Forbidden />;
  const requested = (await searchParams).branch;
  const branch = typeof requested === 'string' && requested ? requested : undefined;
  const [users, options, branches, summaries, resetRequests] = await Promise.all([listManagedUsers(session, { branch }), listUserOptions(session), listBranches(session), listOwnerSummaries(session), listPasswordResetRequests(session)]);
  const total = branches.reduce((sum, b) => sum + b.userCount, 0);
  const isAdmin = session.role === 'admin';
  const day = today();
  // แท็บสาขาเฉพาะเจ้าของที่ดูแลหลายสาขา (admin ดูพนักงานผ่านหน้าเจ้าของแทน)
  const showTabs = !isAdmin && branches.length > 1;
  return (
    <>
      <PageHeader kicker={isAdmin ? 'ทุกสาขา' : branches.length > 1 ? branches.map(b => b.branch).join(' · ') : session.branch} title="จัดการบัญชีผู้ใช้" />
      {showTabs && (
        <nav aria-label="เลือกสาขา" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <Link href="/users" aria-current={branch ? undefined : 'page'} className={TAB}>
            ทุกสาขาของฉัน
            <span className="rounded-full bg-black/20 px-2 text-xs">{total}</span>
          </Link>
          {branches.map(b => (
            <Link key={b.branch} href={`/users?branch=${encodeURIComponent(b.branch)}`} aria-current={branch === b.branch ? 'page' : undefined} className={TAB}>
              {b.branch}
              {b.owners.length > 0 && <span className="text-xs opacity-80">· {b.owners.join(', ')}</span>}
              <span className="rounded-full bg-black/20 px-2 text-xs">{b.userCount}</span>
            </Link>
          ))}
        </nav>
      )}
      {resetRequests.length > 0 && (
        <Card title="คำขอรีเซ็ตรหัสผ่าน" subtitle={`${String(resetRequests.length)} คำขอจากหน้า "ลืมรหัสผ่าน" · ตรวจตัวตนก่อนรีเซ็ต แล้วแจ้งรหัสชั่วคราวให้ผู้ใช้`}>
          <ul className="divide-y divide-line">
            {resetRequests.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <b className="block">{r.user.name}</b>
                  <span className="text-xs text-muted">{r.user.login} · {r.user.roleName} · {r.user.branch} · ขอเมื่อ {formatThaiDateOf(r.requestedAt)} {formatThaiTime(r.requestedAt)}</span>
                </div>
                <ActionButton
                  action={resolvePasswordResetAction.bind(null, r.id, 'reset')}
                  label="รีเซ็ตรหัสผ่าน"
                  pendingLabel="กำลังรีเซ็ต…"
                  variant="primary"
                  confirm={`รีเซ็ตรหัสผ่านของ ${r.user.name} เป็นรหัสชั่วคราว? ผู้ใช้จะออกจากระบบทุกเครื่อง และต้องตั้งรหัสใหม่ตอนเข้าสู่ระบบ`}
                  successTitle="รีเซ็ตรหัสผ่านสำเร็จ"
                />
                <ActionButton action={resolvePasswordResetAction.bind(null, r.id, 'dismissed')} label="ปิดคำขอ" pendingLabel="กำลังปิด…" variant="ghost" confirm={`ปิดคำขอของ ${r.user.name} โดยไม่รีเซ็ต?`} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="เพิ่มบัญชีใหม่" subtitle="กำหนดข้อมูลเข้าสู่ระบบและบทบาทที่ต้องการ">
        <ManagedUserForm key={branch ?? ""} branch={branch && branches.some(b => b.branch === branch) ? branch : session.branch} options={options} canManageRoles={isAdmin} action={createManagedUserAction} today={day} />
      </Card>
      <Card
        title={isAdmin ? 'ผู้ดูแลระบบและเจ้าของ' : branch ? `บัญชีใน${branch.startsWith('สาขา') ? '' : 'สาขา '}${branch}` : 'บัญชีในระบบ'}
        subtitle={isAdmin ? `${String(users.length)} บัญชี · พนักงานอื่นดูได้จากปุ่มดวงตาของเจ้าของแต่ละคน` : `${String(users.length)} บัญชี`}
      >
        {users.length === 0 ? <EmptyState>ยังไม่มีบัญชีผู้ใช้</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="px-3 py-2">ชื่อ</th><th className="px-3 py-2">ข้อมูลเข้าสู่ระบบ</th><th className="px-3 py-2">บทบาท</th><th className="px-3 py-2">สาขา</th>{isAdmin && <th className="px-3 py-2">พนักงาน</th>}<th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr></thead>
              <tbody className="divide-y divide-line">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-3 py-3"><b className="block">{user.name}</b><span className="text-xs text-muted">{user.nickname}</span></td>
                    <td className="px-3 py-3">{user.login}</td>
                    <td className="px-3 py-3">{user.roleName}</td>
                    <td className="px-3 py-3">{summaries[user.id]?.branches.join(' · ') ?? user.branch}</td>
                    {isAdmin && <td className="px-3 py-3 text-muted">{summaries[user.id] ? `${String(summaries[user.id]?.staffCount)} คน` : '—'}</td>}
                    {/* w-px = คอลัมน์สุดท้ายกว้างเท่าเนื้อหา ไม่เหลือที่ว่างท้ายตาราง */}
                    <td className="w-px whitespace-nowrap px-3 py-3">
                      {/* ปุ่มดู/แก้ไข/ลบอยู่ติดสถานะ (ไม่แยกคอลัมน์ให้ห่างไปท้ายตาราง) */}
                      <div className="flex items-center gap-2">
                        <UserStatusBadge user={user} today={day} />
                        {isAdmin && (
                          <UserRowActions
                            id={user.id}
                            name={user.name}
                            back="/users"
                            viewHref={user.role === 'owner' ? `/users/${encodeURIComponent(user.id)}` : undefined}
                            deleteAction={user.id === session.userId ? undefined : deleteManagedUserAction.bind(null, user.id, null)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
