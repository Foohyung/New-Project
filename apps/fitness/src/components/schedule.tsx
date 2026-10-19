import { addDays, bangkokDate } from '@repo/utils';
import Link from 'next/link';
import type { ClassDto } from '@/features/classes/types';
import { classTime } from './dashboard';
import { Badge } from './ui';

const dayName = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', weekday: 'short' });
const dayNum = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const label = (date: string) => ({ weekday: dayName.format(new Date(`${date}T00:00:00Z`)), day: dayNum.format(new Date(`${date}T00:00:00Z`)) });

export function ClassChip({ c, href }: { c: ClassDto; href: string }) {
  const full = c.booked >= c.capacity;
  const pct = Math.min(100, (c.booked / c.capacity) * 100);
  return (
    <Link href={href} className={`flex flex-col gap-1 rounded-xl border p-3 hover:border-muted ${c.state === 'ended' ? 'border-line/60 opacity-55' : c.state === 'live' ? 'border-lime/50 bg-lime/5' : 'border-line bg-bg'}`}>
      <span className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="tabular-nums">{classTime(c)}</span>
        {c.myBookingId ? <Badge tone="lime">จองแล้ว</Badge> : c.state === 'live' ? <Badge tone="lime">กำลังเรียน</Badge> : full ? <Badge tone="danger">เต็ม</Badge> : null}
      </span>
      <b className="font-medium leading-snug">{c.title}</b>
      <span className="text-xs text-muted">{c.trainerName} · {c.room}</span>
      <span aria-hidden className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String(pct)}%` }} className={`block h-full rounded-full ${full ? 'bg-danger' : 'bg-cyan'}`} /></span>
      <span className="text-xs text-faint">จองแล้ว {c.booked}/{c.capacity}</span>
    </Link>
  );
}

/**
 * ตารางคลาส 7 วัน
 * มือถือ: เลือกทีละวัน (แท็บวัน) · เดสก์ท็อป (≥ xl): 7 คอลัมน์พร้อมกัน (§15.2.4)
 */
export function WeekSchedule({ classes, from, selected, basePath, hrefFor, dayHref }: { classes: ClassDto[]; from: string; selected: string; basePath: string; hrefFor: (c: ClassDto) => string; dayHref?: (date: string) => string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const byDay = (date: string) => classes.filter(c => bangkokDate(new Date(c.startsAt)) === date);
  return (
    <>
      <nav aria-label="เลือกวัน" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 xl:hidden">
        {days.map(d => {
          const l = label(d);
          return (
            <Link key={d} href={dayHref ? dayHref(d) : `${basePath}?from=${from}&day=${d}`} aria-current={d === selected ? 'page' : undefined} className="flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg">
              <span className="text-xs">{l.weekday}</span>
              <b className="font-semibold">{l.day}</b>
            </Link>
          );
        })}
      </nav>
      <div className="xl:hidden">
        {byDay(selected).length === 0 ? <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">ไม่มีคลาสในวันนี้</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{byDay(selected).map(c => <li key={c.id}><ClassChip c={c} href={hrefFor(c)} /></li>)}</ul>
        )}
      </div>
      <div className="hidden grid-cols-7 gap-3 xl:grid">
        {days.map(d => {
          const l = label(d);
          return (
            <section key={d} aria-label={`${l.weekday} ${l.day}`} className="flex min-w-0 flex-col gap-2">
              <h2 className={`rounded-xl px-3 py-2 text-sm ${d === from ? 'bg-lime text-bg' : 'bg-surface text-muted'}`}>
                <span className="block text-xs">{l.weekday}</span>
                <b className="font-semibold">{l.day}</b>
              </h2>
              {byDay(d).map(c => <ClassChip key={c.id} c={c} href={hrefFor(c)} />)}
              {byDay(d).length === 0 && <p className="px-1 text-xs text-faint">ไม่มีคลาส</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}

export { label as dayLabel };
