import { addDays, bangkokDate } from '@repo/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { ActionButton } from '@/components/action-button';
import { classTime } from '@/components/dashboard';
import { Badge, EmptyState, Forbidden, PageHeader } from '@/components/ui';
import { bookSelfAction, cancelBookingAction } from '@/features/classes/actions';
import { CANCEL_CUTOFF_MINUTES } from '@/features/classes/service';
import { today } from '@/server/clock';
import { listClasses } from '@/server/dal/classes';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'จองคลาส' };

const SearchParams = z.object({ day: z.iso.date().optional().catch(undefined) });
const weekday = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' });

/** สมาชิกจองคลาสเอง — มือถือก่อน: เลือกวัน แล้วกดจองจากรายการ */
export default async function MyClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return <Forbidden message="หน้านี้สำหรับสมาชิก — สลับเป็นบทบาทสมาชิกเพื่อดูตัวอย่าง" />;
  const from = today();
  const { day } = SearchParams.parse(await searchParams);
  const selected = day && day >= from && day < addDays(from, 7) ? day : from;
  const classes = await listClasses(session, from, 7);
  const list = classes.filter(c => bangkokDate(new Date(c.startsAt)) === selected);

  return (
    <>
      <PageHeader back={{ href: '/me', label: 'บัตรสมาชิก' }} title="จองคลาส" kicker={`ยกเลิกได้ก่อนคลาสเริ่ม ${String(CANCEL_CUTOFF_MINUTES / 60)} ชั่วโมง`} />
      <nav aria-label="เลือกวัน" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d, i) => {
          const date = new Date(`${d}T00:00:00Z`);
          return (
            <Link key={d} href={`/me/classes?day=${d}`} aria-current={d === selected ? 'page' : undefined} className="flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg">
              <span className="text-xs">{i === 0 ? 'วันนี้' : weekday.format(date)}</span>
              <b className="font-semibold">{dayMonth.format(date)}</b>
            </Link>
          );
        })}
      </nav>
      {list.length === 0 ? <EmptyState>ไม่มีคลาสในวันนี้ ลองเลือกวันอื่น</EmptyState> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(c => {
            const full = c.booked >= c.capacity;
            return (
              <li key={c.id} className={`flex flex-col gap-2 rounded-2xl border bg-surface p-4 ${c.myBookingId ? 'border-lime/50' : 'border-line'} ${c.state === 'ended' ? 'opacity-55' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted tabular-nums">{classTime(c)} น.</span>
                  {c.myBookingId ? <Badge tone="lime">จองแล้ว</Badge> : full ? <Badge tone="danger">เต็ม</Badge> : <Badge>ว่าง {c.capacity - c.booked} ที่</Badge>}
                </div>
                <b className="font-display text-lg font-semibold">{c.title}</b>
                <p className="text-sm text-muted">{c.trainerName} · {c.room} · ระดับ{c.level}</p>
                {c.state === 'upcoming' && (
                  c.myBookingId
                    ? <ActionButton action={cancelBookingAction.bind(null, c.myBookingId)} label="ยกเลิกการจอง" variant="ghost" confirm={`ยกเลิกการจอง ${c.title}?`} />
                    : !full && <ActionButton action={bookSelfAction.bind(null, c.id)} label="จองคลาสนี้" variant="primary" pendingLabel="กำลังจอง…" />
                )}
                {c.state !== 'upcoming' && <p className="text-sm text-faint">{c.state === 'live' ? 'คลาสกำลังเรียนอยู่' : 'คลาสจบแล้ว'}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
