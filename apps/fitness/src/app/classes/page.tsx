import { addDays, formatThaiDate } from '@repo/utils';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { WeekSchedule } from '@/components/schedule';
import { btn, Forbidden, PageHeader } from '@/components/ui';
import { today } from '@/server/clock';
import { listClasses } from '@/server/dal/classes';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'ตารางคลาส' };

const SearchParams = z.object({
  from: z.iso.date().optional().catch(undefined),
  day: z.iso.date().optional().catch(undefined),
});

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('classes.view');
  if (!allowed) return <Forbidden />;
  const params = SearchParams.parse(await searchParams);
  const from = params.from ?? today();
  const selected = params.day && params.day >= from && params.day < addDays(from, 7) ? params.day : from;
  const classes = await listClasses(session, from, 7);
  const mine = session.role === 'trainer' ? classes.filter(c => c.trainerId === session.trainerId && c.state !== 'ended') : [];

  return (
    <>
      <PageHeader
        kicker={`${formatThaiDate(from)} – ${formatThaiDate(addDays(from, 6))}`}
        title="ตารางคลาส"
        actions={
          <>
            <Link href={`/classes?from=${addDays(from, -7)}`} className={btn.secondary}>← สัปดาห์ก่อน</Link>
            <Link href={`/classes?from=${addDays(from, 7)}`} className={btn.secondary}>สัปดาห์ถัดไป →</Link>
            {can(session, 'classes.manage') && <Link href="/classes/new" className={btn.primary}><Plus aria-hidden className="size-5" />เพิ่มคลาส</Link>}
          </>
        }
      />
      {mine.length > 0 && (
        <p className="rounded-2xl border border-lime/30 bg-lime/5 p-4 text-sm">
          คลาสของคุณสัปดาห์นี้ {mine.length} คลาส · ถัดไป <Link href={`/classes/${mine[0]?.id ?? ''}`} className="tap inline-block font-semibold text-lime underline underline-offset-2">{mine[0]?.title}</Link>
        </p>
      )}
      <WeekSchedule classes={classes} from={from} selected={selected} basePath="/classes" hrefFor={c => `/classes/${c.id}`} />
    </>
  );
}
