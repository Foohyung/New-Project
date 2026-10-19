import type { Metadata } from 'next';
import { MoreMenu } from '@/components/nav';
import { PageHeader } from '@/components/ui';
import { ROLE_LABEL } from '@/features/auth/roles';
import { requireSession } from '@/server/auth';

export const metadata: Metadata = { title: 'เมนูทั้งหมด' };

/** หน้ารวมเมนูสำหรับมือถือ (bottom tab bar แสดงได้ไม่เกิน 5 เมนู) */
export default async function MorePage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader kicker={`${session.name} · ${ROLE_LABEL[session.role]} · ${session.branch}`} title="เมนูทั้งหมด" />
      <MoreMenu role={session.role} />
    </>
  );
}
