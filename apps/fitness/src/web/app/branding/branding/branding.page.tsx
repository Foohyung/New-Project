import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveBranchBrandingAction } from '@/api/actions/branding/branding/branding.actions';
import { getBranchBranding, listBranchBrandings } from '@/api/dal/branding/branding/branding.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { BrandingForm } from '@/web/components/branding/branding/branding.form';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'แบรนด์สาขา' };

export default async function BrandingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed } = await pageGuard('branding.manage');
  if (!allowed) return accessDenied();

  const params: Record<string, string | string[] | undefined> = session.role === 'admin' ? await searchParams : {};
  const requestedBranch = typeof params.branch === 'string' ? params.branch : undefined;

  if (session.role === 'admin') {
    const branches = await listBranchBrandings(session);

    if (!requestedBranch) {
      return (
        <>
          <PageHeader kicker="จัดการแบรนด์ทุกสาขา" title="แบรนด์สาขา" />
          <Card title="สาขาทั้งหมด" subtitle={`${String(branches.length)} สาขา`}>
            {branches.length === 0 ? <EmptyState>ยังไม่มีสาขาให้ตั้งค่าแบรนด์</EmptyState> : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {branches.map(branch => {
                  const logoSrc = branch.hasUploadedLogo
                    ? `/api/branding/logo?branch=${encodeURIComponent(branch.branch)}`
                    : branch.logoUrl;
                  return (
                    <li key={branch.branch}>
                      <Link
                        href={`/branding?branch=${encodeURIComponent(branch.branch)}`}
                        className="flex min-h-28 items-center gap-3 rounded-xl border border-line bg-bg p-4 transition-colors hover:border-lime/50 hover:bg-surface-2"
                      >
                        {logoSrc ? (
                          <Image src={logoSrc} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-xl object-contain" />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-sm font-bold text-muted">{branch.branch.slice(0, 1)}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{branch.branch}</span>
                          <span className="block truncate text-sm text-muted">{branch.gymName || 'ยังไม่ได้ตั้งชื่อ Gym'}</span>
                        </span>
                        <Badge tone={branch.active ? 'lime' : 'muted'}>{branch.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      );
    }

    if (!branches.some(branch => branch.branch === requestedBranch)) notFound();
  }

  const branding = await getBranchBranding(session, requestedBranch ?? session.branch);
  return (
    <>
      <PageHeader
        kicker={branding.branch}
        title="ปรับแต่งแบรนด์สาขา"
        back={session.role === 'admin' ? { href: '/branding', label: 'แบรนด์สาขา' } : undefined}
      />
      <Card title="สีและโลโก้" subtitle="การเปลี่ยนแปลงจะแสดงให้ผู้ใช้ทุกคนในสาขานี้เห็น">
        <BrandingForm branding={branding} action={saveBranchBrandingAction.bind(null, branding.branch)} />
      </Card>
    </>
  );
}
