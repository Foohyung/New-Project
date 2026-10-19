import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar, Badge, Forbidden, PageHeader } from '@/components/ui';
import { listTrainers } from '@/server/dal/trainers';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'เทรนเนอร์' };

export default async function TrainersPage() {
  const { session, allowed } = await pageGuard('trainers.view');
  if (!allowed) return <Forbidden />;
  const trainers = await listTrainers(session);
  return (
    <>
      <PageHeader kicker={session.branch} title="เทรนเนอร์" />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {trainers.map(t => (
          <li key={t.id} className="relative flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime">
            <div className="flex items-center gap-3">
              <Avatar name={t.name} className="size-12" />
              <div className="min-w-0">
                <Link href={`/trainers/${t.id}`} className="tap block truncate font-display text-lg font-semibold outline-none after:absolute after:inset-0">{t.nickname}</Link>
                <small className="text-xs text-muted">{t.name}</small>
              </div>
            </div>
            <p className="flex flex-wrap gap-1.5">{t.specialties.map(s => <Badge key={s} tone="cyan">{s}</Badge>)}</p>
            <p className="text-sm text-muted">{t.bio}</p>
            <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
              <div><dt className="text-xs text-faint">คลาส 7 วันนี้</dt><dd className="font-display text-xl font-semibold">{t.classesThisWeek}</dd></div>
              <div><dt className="text-xs text-faint">คิว PT ที่รออยู่</dt><dd className="font-display text-xl font-semibold">{t.ptUpcoming}</dd></div>
            </dl>
            {session.trainerId === t.id && <Badge tone="lime">บัญชีของคุณ</Badge>}
          </li>
        ))}
      </ul>
    </>
  );
}
