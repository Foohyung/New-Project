import type { Metadata } from 'next';
import { MoreMenu } from '@/web/components/layout/layout/layout.nav';
import { PageHeader } from '@/web/components/ui/ui/ui';
import { roleLabel } from '@/api/services/auth/auth/auth.roles';
import { requireSession } from '@/api/lib/auth/auth/auth.session';

export const metadata: Metadata = { title: 'เมนูทั้งหมด' };

/** หน้ารวมเมนูสำหรับมือถือ (bottom tab bar แสดงได้ไม่เกิน 5 เมนู) */
export default async function MorePage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader kicker={`${session.name} · ${roleLabel(session.role, session.roleName)} · ${session.branch}`} title="เมนูทั้งหมด" />
      <MoreMenu role={session.role} permissions={session.permissions} />
    </>
  );
}
