import { bangkokDate } from '@/api/lib/utils/utils/utils';
import Link from 'next/link';
import type { ClassDto } from '@/api/types/classes/classes/classes.types';
import { classTime } from '@/web/components/dashboard/dashboard/dashboard';
import { Badge } from '@/web/components/ui/ui/ui';

const dayName = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', weekday: 'short' });
const dayNum = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const label = (date: string) => ({ weekday: dayName.format(new Date(`${date}T00:00:00Z`)), day: dayNum.format(new Date(`${date}T00:00:00Z`)) });

export function ClassChip({ c, href }: { c: ClassDto; href: string }) {
  const full = c.booked >= c.capacity;
  const pct = Math.min(100, (c.booked / c.capacity) * 100);
  return (
    <div className={`rounded-xl border p-3 hover:border-muted ${c.state === 'ended' ? 'border-line/60 opacity-55' : c.state === 'live' ? 'border-lime/50 bg-lime/5' : 'border-line bg-bg'}`}>
      <Link href={href} className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="tabular-nums">{classTime(c)}</span>
          {c.myBookingId ? <Badge tone="lime">จองแล้ว</Badge> : c.state === 'live' ? <Badge tone="lime">กำลังเรียน</Badge> : full ? <Badge tone="danger">เต็ม</Badge> : null}
        </span>
        <b className="font-medium leading-snug">{c.title}</b>
        <span className="text-xs text-muted">{c.trainerName} · {c.room}</span>
        <span aria-hidden className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String(pct)}%` }} className={`block h-full rounded-full ${full ? 'bg-danger' : 'bg-cyan'}`} /></span>
        <span className="text-xs text-faint">จองแล้ว {c.booked}/{c.capacity}</span>
      </Link>
    </div>
  );
}

/** ปฏิทินแสดงวัน/สัปดาห์/เดือนตามช่วงวันที่ที่ส่งเข้ามา */
export function WeekSchedule({ classes, days, selected, period, month }: { classes: ClassDto[]; days: string[]; selected: string; period: 'day' | 'week' | 'month'; month?: string }) {
  const byDay = (date: string) => classes.filter(c => bangkokDate(new Date(c.startsAt)) === date);
  return (
    <div className={`grid gap-2 sm:gap-3 ${period === 'day' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-7'}`}>
      {period !== 'day' && ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(weekday => (
        <div key={weekday} className="hidden px-2 py-1 text-xs font-medium text-muted xl:block">{weekday}</div>
      ))}
        {days.map(d => {
          const l = label(d);
          const inMonth = !month || d.slice(0, 7) === month.slice(0, 7);
          return (
            <section key={d} aria-label={`${l.weekday} ${l.day}`} className={`flex min-h-28 min-w-0 flex-col gap-1.5 rounded-xl border border-line p-1.5 sm:min-h-36 sm:gap-2 sm:p-2 ${d === selected ? 'border-lime/60 bg-lime/5' : 'bg-surface/50'} ${inMonth ? '' : 'opacity-45'}`}>
              <h2 className={`flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold sm:min-h-9 sm:text-sm ${d === selected ? 'bg-lime text-bg' : 'bg-surface text-muted'}`}>
                <span className="truncate">{period === 'day' ? formatLongDay(d) : l.day}</span>
              </h2>
              {byDay(d).map(c => <ClassChip key={c.id} c={c} href={`/classes/${c.id}`} />)}
              {byDay(d).length === 0 && <p className="px-1 text-[11px] text-faint sm:text-xs">ไม่มีคลาส</p>}
            </section>
          );
        })}
    </div>
  );
}

const formatLongDay = (date: string) => new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00Z`));

export { label as dayLabel };
