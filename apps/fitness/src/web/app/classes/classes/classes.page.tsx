import { addDays, bangkokDate, formatThaiDate, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { Calendar, CalendarDays, CalendarRange, List, Plus, Users, UserRound, DoorOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { classTime } from '@/web/components/dashboard/dashboard/dashboard';
import { ClassChip, dayLabel, WeekSchedule } from '@/web/components/classes/classes/classes.schedule';
import { ClassMonthPicker } from '@/web/components/classes/classes/classes.month-picker';
import { Badge, btn, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { UrlDropdown } from '@/web/components/ui/ui/ui.url-dropdown';
import { hrefWith, Toolbar, ViewSwitch } from '@/web/components/ui/ui/ui.view-switch';
import type { ClassDto } from '@/api/types/classes/classes/classes.types';
import type { TrainerDto } from '@/api/types/trainers/trainers/trainers.types';
import { today } from '@/api/lib/clock/clock/clock';
import { listClasses } from '@/api/dal/classes/classes/classes.dal';
import { listTrainers } from '@/api/dal/trainers/trainers/trainers.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { can } from '@/api/lib/auth/auth/auth.rbac';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'ตารางคลาส' };

const PERIODS = ['day', 'week', 'month'] as const;
const VIEWS = ['calendar', 'room', 'list', 'trainer'] as const;

const SearchParams = z.object({
  from: z.iso.date().optional().catch(undefined),
  period: z.enum(PERIODS).catch('week'),
  view: z.enum(VIEWS).catch('calendar'),
  trainer: z.string().max(10).optional().catch(undefined),
});

const PERIOD_OPTIONS = [
  { value: 'day', label: 'วัน', icon: <CalendarDays className="size-4" /> },
  { value: 'week', label: 'สัปดาห์', icon: <CalendarRange className="size-4" /> },
  { value: 'month', label: 'เดือน', icon: <Calendar className="size-4" /> },
];

const VIEW_OPTIONS = [
  { value: 'calendar', label: 'ปฏิทิน', icon: <CalendarRange className="size-4" /> },
  { value: 'room', label: 'ตามห้อง', icon: <DoorOpen className="size-4" /> },
  { value: 'list', label: 'รายการ', icon: <List className="size-4" /> },
  { value: 'trainer', label: 'ตามเทรนเนอร์', icon: <Users className="size-4" /> },
];

const LEVEL_TONE = { ง่าย: 'lime', กลาง: 'warn', หนัก: 'danger' } as const;
const dateOf = (c: ClassDto) => bangkokDate(new Date(c.startsAt));
const mondayOf = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const monthOf = (date: string, offset: number) => {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + offset, 1)).toISOString().slice(0, 10);
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('classes.view');
  if (!allowed) return accessDenied();
  const params = SearchParams.parse(await searchParams);
  const anchor = params.from ?? today();
  const period = params.period;
  const from = period === 'week' ? mondayOf(anchor) : period === 'month' ? monthOf(anchor, 0) : anchor;
  const monthOffset = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthLength = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 0)).getUTCDate();
  const rangeFrom = period === 'month' ? addDays(from, -monthOffset) : from;
  const rangeDays = period === 'day' ? 1 : period === 'week' ? 7 : Math.ceil((monthOffset + monthLength) / 7) * 7;
  const days = Array.from({ length: rangeDays }, (_, i) => addDays(rangeFrom, i));
  const rangeEnd = days.at(-1) ?? from;
  const [classes, trainers] = await Promise.all([listClasses(session, rangeFrom, rangeDays), listTrainers(session)]);
  const trainer = trainers.find(t => t.id === params.trainer);
  const filteredClasses = trainer ? classes.filter(c => c.trainerId === trainer.id) : classes;
  const mine = session.role === 'trainer' ? classes.filter(c => c.trainerId === session.trainerId && c.state !== 'ended') : [];
  const view = params.view;
  const current = { from: anchor, period, trainer: trainer?.id, view: view === 'calendar' ? undefined : view };
  const href = (patch: Record<string, string | undefined>) => hrefWith('/classes', current, patch);
  const rangeLabel = period === 'month'
    ? new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${from}T00:00:00Z`))
    : from === rangeEnd ? formatThaiDate(from, 'long') : `${formatThaiDate(from)} – ${formatThaiDate(rangeEnd)}`;
  const selected = anchor >= rangeFrom && anchor <= rangeEnd ? anchor : from;

  return (
    <>
      <PageHeader
        kicker={rangeLabel}
        title="ตารางคลาส"
        actions={
          <>
            <Link href={href({ from: today() })} className={btn.secondary}>วันนี้</Link>
            {can(session, 'classes.manage') && <Link href="/classes/new" className={btn.primary}><Plus aria-hidden className="size-5" />เพิ่มคลาส</Link>}
          </>
        }
      />
      {mine.length > 0 && (
        <p className="rounded-2xl border border-lime/30 bg-lime/5 p-4 text-sm">
          คลาสของคุณในช่วงนี้ {mine.length} คลาส · ถัดไป <Link href={`/classes/${mine[0]?.id ?? ''}`} className="tap inline-block font-semibold text-lime underline underline-offset-2">{mine[0]?.title}</Link>
        </p>
      )}

      <Toolbar>
        <ViewSwitch views={PERIOD_OPTIONS} current={period} hrefFor={v => href({ period: v, from: anchor })} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {period === 'month' && <ClassMonthPicker key={from} value={from.slice(0, 7)} />}
          <UrlDropdown
            label="รูปแบบ"
            value={view}
            options={VIEW_OPTIONS.map(option => ({ ...option, href: href({ view: option.value === 'calendar' ? undefined : option.value }) }))}
          />
          <UrlDropdown
            label="เทรนเนอร์"
            align="end"
            value={trainer?.id ?? ''}
            options={[
              { value: '', label: 'ทุกเทรนเนอร์', icon: <UserRound className="size-4" />, href: href({ trainer: undefined }) },
              ...trainers.map(t => ({ value: t.id, label: t.nickname, description: t.specialties.join(' · '), icon: <span className="size-3 rounded-full" style={{ backgroundColor: t.color }} />, href: href({ trainer: t.id }) })),
            ]}
          />
        </div>
      </Toolbar>

      {view === 'room' ? (
        <DayByRoom classes={filteredClasses} days={days} />
      ) : view === 'list' ? (
        <ListView classes={filteredClasses} />
      ) : view === 'trainer' ? (
        <ByTrainer classes={filteredClasses} trainers={trainer ? [trainer] : trainers} days={days} />
      ) : (
        <WeekSchedule classes={filteredClasses} days={days} selected={selected} period={period} month={period === 'month' ? from : undefined} />
      )}
    </>
  );
}

/** จัดคลาสแยกตามวันและห้องในช่วงเวลาที่เลือก */
function DayByRoom({ classes, days }: { classes: ClassDto[]; days: string[] }) {
  const activeDays = days.filter(date => classes.some(c => dateOf(c) === date));
  if (activeDays.length === 0) return <EmptyState>ไม่มีคลาสในช่วงนี้</EmptyState>;
  return (
    <div className="flex flex-col gap-4">
      {activeDays.map(date => {
        const dayClasses = classes.filter(c => dateOf(c) === date);
        const rooms = [...new Set(dayClasses.map(c => c.room))].sort();
        return (
          <section key={date} className="rounded-2xl border border-line bg-surface/50 p-3 sm:p-4">
            <h2 className="mb-3 font-semibold">{formatThaiDate(date, 'long')}</h2>
            {rooms.length === 0 ? <p className="text-sm text-faint">ไม่มีคลาส</p> : (
              <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
                {rooms.map(room => {
                  const items = dayClasses.filter(c => c.room === room);
                  return (
                    <section key={room} aria-labelledby={`room-${date}-${room}`} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                      <h3 id={`room-${date}-${room}`} className="flex items-center justify-between px-1 py-1 font-semibold">
                        {room}
                        <span className="rounded-full bg-surface-2 px-2 text-xs font-normal text-muted">{items.length} คลาส</span>
                      </h3>
                      {items.map(c => <ClassChip key={c.id} c={c} href={`/classes/${c.id}`} />)}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** รายการ: ทุกคลาสทั้งสัปดาห์ เรียงตามเวลา — มือถือเป็นการ์ด แท็บเล็ตขึ้นไปเป็นตาราง */
function ListView({ classes }: { classes: ClassDto[] }) {
  if (classes.length === 0) return <EmptyState>ไม่มีคลาสในช่วงนี้</EmptyState>;
  const seats = (c: ClassDto) => {
    const full = c.booked >= c.capacity;
    return <span className={full ? 'font-semibold text-danger' : ''}>{c.booked}/{c.capacity}{full && ' เต็ม'}</span>;
  };
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {classes.map(c => (
          <li key={c.id} className={`relative grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-surface p-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime ${c.state === 'ended' ? 'opacity-55' : ''}`}>
            <span className="text-xs text-muted">{dayLabel(dateOf(c)).weekday} {dayLabel(dateOf(c)).day}<b className="block text-sm text-ink tabular-nums">{formatThaiTime(c.startsAt)}</b></span>
            <div className="min-w-0">
              <Link href={`/classes/${c.id}`} className="tap block truncate font-medium outline-none after:absolute after:inset-0">{c.title}</Link>
              <small className="block truncate text-xs text-muted">{c.trainerName} · {c.room}</small>
            </div>
            <span className="text-sm">{seats(c)}</span>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="text-xs text-faint">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">วัน</th>
              <th scope="col" className="px-5 py-3 font-medium">เวลา</th>
              <th scope="col" className="px-5 py-3 font-medium">คลาส</th>
              <th scope="col" className="px-5 py-3 font-medium">เทรนเนอร์</th>
              <th scope="col" className="px-5 py-3 font-medium">ห้อง</th>
              <th scope="col" className="px-5 py-3 font-medium">ระดับ</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">จอง/ที่นั่ง</th>
            </tr>
          </thead>
          <tbody className="ff-stagger divide-y divide-line">
            {classes.map(c => (
              <tr key={c.id} className={`hover:bg-surface-2/50 ${c.state === 'ended' ? 'text-muted' : ''}`}>
                <td className="px-5 py-3 whitespace-nowrap">{dayLabel(dateOf(c)).weekday} {dayLabel(dateOf(c)).day}</td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums">{classTime(c)}</td>
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <Link href={`/classes/${c.id}`} className="tap inline-block font-medium hover:underline">{c.title}</Link>
                  {c.state === 'live' && <> <Badge tone="lime">กำลังเรียน</Badge></>}
                </th>
                <td className="px-5 py-3">{c.trainerName}</td>
                <td className="px-5 py-3">{c.room}</td>
                <td className="px-5 py-3"><Badge tone={LEVEL_TONE[c.level]}>{c.level}</Badge></td>
                <td className="px-5 py-3 text-right tabular-nums">{seats(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** จัดคลาสเป็นกลุ่มตามเทรนเนอร์และวันที่ */
function ByTrainer({ classes, trainers, days }: { classes: ClassDto[]; trainers: TrainerDto[]; days: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {trainers.map(t => {
        const items = classes.filter(c => c.trainerId === t.id);
        return (
          <section key={t.id} aria-labelledby={`tr-${t.id}`} className="rounded-2xl border border-line bg-surface/60 p-3 sm:p-4">
            <header className="mb-3 flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
              <h2 id={`tr-${t.id}`} className="font-semibold"><Link href={`/trainers/${t.id}`} className="tap inline-block hover:underline">{t.nickname}</Link></h2>
              <span className="ml-auto text-xs text-muted">{items.length} คลาส</span>
            </header>
            {items.length === 0 ? <p className="text-sm text-faint">ไม่มีคลาสในช่วงนี้</p> : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {days.map(d => {
                  const dayItems = items.filter(c => dateOf(c) === d);
                  if (dayItems.length === 0) return null;
                  return (
                    <section key={d} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                      <h3 className="text-sm font-semibold">{formatThaiDate(d, 'long')}</h3>
                      {dayItems.map(c => <ClassChip key={c.id} c={c} href={`/classes/${c.id}`} />)}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
