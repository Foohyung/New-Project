import type { Metadata } from 'next';
import { saveBranchBrandingAction } from '@/api/actions/branding/branding/branding.actions';
import { getBranchBranding } from '@/api/dal/branding/branding/branding.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { BrandingForm } from '@/web/components/branding/branding/branding.form';
import { Card, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'แบรนด์สาขา' };

export default async function BrandingPage() {
  const { session, allowed } = await pageGuard('branding.manage');
  if (!allowed) return <Forbidden />;
  const branding = await getBranchBranding(session);
  return (
    <>
      <PageHeader kicker={session.branch} title="ปรับแต่งแบรนด์สาขา" />
      <Card title="สีและโลโก้" subtitle="การเปลี่ยนแปลงจะแสดงให้ผู้ใช้ทุกคนในสาขานี้เห็น">
        <BrandingForm branding={branding} action={saveBranchBrandingAction} />
      </Card>
    </>
  );
}
