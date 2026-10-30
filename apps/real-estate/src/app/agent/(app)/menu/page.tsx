import type { Metadata } from 'next';
import { MoreMenu } from '@/components/agent/nav';
import { PageHeader } from '@/components/agent/ui';
import { requireSession } from '@/server/agent/auth';

export const metadata: Metadata = { title: 'เมนูทั้งหมด' };

export default async function MenuPage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader title="เมนูทั้งหมด" />
      <MoreMenu role={session.role} />
    </>
  );
}
