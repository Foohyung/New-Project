import type { Metadata } from 'next';
import { resolvePasswordResetAction } from '@/api/actions/users/users/users.actions';
import { listPasswordResetRequests } from '@/api/dal/users/users/users.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatThaiDateOf, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'คำขอรีเซ็ตรหัสผ่าน' };

export default async function PasswordResetRequestsPage() {
  const { session, allowed } = await pageGuard('users.manage');
  if (!allowed) return accessDenied();
  const requests = await listPasswordResetRequests(session);

  return (
    <>
      <PageHeader kicker="ตั้งค่า · บัญชีผู้ใช้" title="คำขอรีเซ็ตรหัสผ่าน" />
      <Card
        title={`คำขอที่รอดำเนินการ · ${String(requests.length)}`}
        subtitle="ตรวจสอบตัวตนผู้ขอก่อนรีเซ็ต แล้วแจ้งรหัสชั่วคราวให้ผู้ใช้"
      >
        {requests.length === 0 ? <EmptyState>ไม่มีคำขอรีเซ็ตรหัสผ่าน</EmptyState> : (
          <ul className="divide-y divide-line">
            {requests.map(request => (
              <li key={request.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <b className="block">{request.user.name}</b>
                  <span className="text-xs text-muted">
                    {request.user.login} · {request.user.roleName} · {request.user.branch} · ขอเมื่อ {formatThaiDateOf(request.requestedAt)} {formatThaiTime(request.requestedAt)}
                  </span>
                </div>
                <ActionButton
                  action={resolvePasswordResetAction.bind(null, request.id, 'reset')}
                  label="รีเซ็ตรหัสผ่าน"
                  pendingLabel="กำลังรีเซ็ต…"
                  variant="primary"
                  confirm={`รีเซ็ตรหัสผ่านของ ${request.user.name} เป็นรหัสชั่วคราว? ผู้ใช้จะออกจากระบบทุกเครื่อง และต้องตั้งรหัสใหม่ตอนเข้าสู่ระบบ`}
                  successTitle="รีเซ็ตรหัสผ่านสำเร็จ"
                />
                <ActionButton
                  action={resolvePasswordResetAction.bind(null, request.id, 'dismissed')}
                  label="ปิดคำขอ"
                  pendingLabel="กำลังปิด…"
                  variant="ghost"
                  confirm={`ปิดคำขอของ ${request.user.name} โดยไม่รีเซ็ต?`}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
