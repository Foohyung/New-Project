import { addDays, bangkokDate, formatThaiDate, formatThaiTime } from '@repo/utils';
import { CalendarDays, CalendarRange, List, Plus, Users, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { classTime } from '@/components/dashboard';
import { ClassChip, dayLabel, WeekSchedule } from '@/components/schedule';
import { Badge, btn, EmptyState, Forbidden, PageHeader } from '@/components/ui';
import { UrlDropdown } from '@/components/url-dropdown';
import { hrefWith, Toolbar, ViewSwitch } from '@/components/view-switch';
import type { ClassDto } from '@/features/classes/types';
import type { TrainerDto } from '@/features/trainers/types';
import { today } from '@/server/clock';
import { listClasses } from '@/server/dal/classes';
import { listTrainers } from '@/server/dal/trainers';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'ตารางคลาส' };

const VIEWS = ['week', 'day', 'list', 'trainer'] as const;

const SearchParams = z.object({
  from: z.iso.date().optional().catch(undefined),
  day: z.iso.date().optional().catch(undefined),
  view: z.enum(VIEWS).catch('week'),
  trainer: z.string().max(10).optional().catch(undefined),
});

const VIEW_OPTIONS = [
  { value: 'week', label: 'สัปดาห์', icon: <CalendarRange className="size-4" /> },
  { value: 'day', label: 'รายวันตามห้อง', icon: <CalendarDays className="size-4" /> },
  { value: 'list', label: 'รายการ', icon: <List className="size-4" /> },
  { value: 'trainer', label: 'ตามเทรนเนอร์', icon: <Users className="size-4" /> },
];

const LEVEL_TONE = { ง่าย: 'lime', กลาง: 'warn', หนัก: 'danger' } as const;
const dateOf = (c: ClassDto) => bangkokDate(new Date(c.startsAt));

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('classes.view');
  if (!allowed) return <Forbidden />;
  const params = SearchParams.parse(await searchParams);
  const from = params.from ?? today();
  const selected = params.day && params.day >= from && params.day < addDays(from, 7) ? params.day : from;
  const [all, trainers] = await Promise.all([listClasses(session, from, 7), listTrainers(session)]);
  const trainer = trainers.find(t => t.id === params.trainer);
  const classes = trainer ? all.filter(c => c.trainerId === trainer.id) : all;
  const mine = session.role === 'trainer' ? all.filter(c => c.trainerId === session.trainerId && c.state !== 'ended') : [];
  const view = params.view;
  const current = { from: params.from, day: params.day, trainer: trainer?.id, view: view === 'week' ? undefined : view };
  const href = (patch: Record<string, string | undefined>) => hrefWith('/classes', current, patch);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  return (
    <>
      <PageHeader
        kicker={`${formatThaiDate(from)} – ${formatThaiDate(addDays(from, 6))}`}
        title="ตารางคลาส"
        actions={
          <>
            <Link href={href({ from: addDays(from, -7), day: undefined })} className={btn.secondary}>← สัปดาห์ก่อน</Link>
            <Link href={href({ from: addDays(from, 7), day: undefined })} className={btn.secondary}>สัปดาห์ถัดไป →</Link>
            {can(session, 'classes.manage') && <Link href="/classes/new" className={btn.primary}><Plus aria-hidden className="size-5" />เพิ่มคลาส</Link>}
          </>
        }
      />
      {mine.length > 0 && (
        <p className="rounded-2xl border border-lime/30 bg-lime/5 p-4 text-sm">
          คลาสของคุณสัปดาห์นี้ {mine.length} คลาส · ถัดไป <Link href={`/classes/${mine[0]?.id ?? ''}`} className="tap inline-block font-semibold text-lime underline underline-offset-2">{mine[0]?.title}</Link>
        </p>
      )}

      <Toolbar>
        <ViewSwitch views={VIEW_OPTIONS} current={view} hrefFor={v => href({ view: v === 'week' ? undefined : v })} />
        <div className="ml-auto">
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

      {view === 'day' ? (
        <DayByRoom classes={classes} days={days} selected={selected} dayHref={d => href({ day: d })} />
      ) : view === 'list' ? (
        <ListView classes={classes} />
      ) : view === 'trainer' ? (
        <ByTrainer classes={classes} trainers={trainer ? [trainer] : trainers} days={days} />
      ) : (
        <WeekSchedule classes={classes} from={from} selected={selected} basePath="/classes" hrefFor={c => `/classes/${c.id}`} dayHref={d => href({ day: d })} />
      )}
    </>
  );
}

function DayTabs({ days, selected, dayHref }: { days: string[]; selected: string; dayHref: (d: string) => string }) {
  return (
    <nav aria-label="เลือกวัน" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {days.map(d => {
        const l = dayLabel(d);
        return (
          <Link key={d} href={dayHref(d)} scroll={false} aria-current={d === selected ? 'page' : undefined} className="flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg">
            <span className="text-xs">{l.weekday}</span>
            <b className="font-semibold">{l.day}</b>
          </Link>
        );
      })}
    </nav>
  );
}

/** รายวันตามห้อง: คอลัมน์ละห้อง เห็นว่าห้องไหนว่าง/ชนเวลา (มือถือเรียงห้องต่อกัน) */
function DayByRoom({ classes, days, selected, dayHref }: { classes: ClassDto[]; days: string[]; selected: string; dayHref: (d: string) => string }) {
  const today = classes.filter(c => dateOf(c) === selected);
  const rooms = [...new Set(today.map(c => c.room))].sort();
  return (
    <>
      <DayTabs days={days} selected={selected} dayHref={dayHref} />
      {rooms.length === 0 ? <EmptyState>ไม่มีคลาสในวันนี้</EmptyState> : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
          {rooms.map(room => {
            const items = today.filter(c => c.room === room);
            return (
              <section key={room} aria-labelledby={`room-${room}`} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface/60 p-3">
                <h2 id={`room-${room}`} className="flex items-center justify-between px-1 py-1 font-semibold">
                  {room}
                  <span className="rounded-full bg-surface-2 px-2 text-xs font-normal text-muted">{items.length} คลาส</span>
                </h2>
                {items.map(c => <ClassChip key={c.id} c={c} href={`/classes/${c.id}`} />)}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** รายการ: ทุกคลาสทั้งสัปดาห์ เรียงตามเวลา — มือถือเป็นการ์ด แท็บเล็ตขึ้นไปเป็นตาราง */
function ListView({ classes }: { classes: ClassDto[] }) {
  if (classes.length === 0) return <EmptyState>ไม่มีคลาสในสัปดาห์นี้</EmptyState>;
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
          <tbody className="divide-y divide-line">
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

/** ตามเทรนเนอร์: แถวละคน × 7 วัน (≥ xl) — จอเล็กเรียงเป็นกลุ่มต่อคน */
function ByTrainer({ classes, trainers, days }: { classes: ClassDto[]; trainers: TrainerDto[]; days: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className="hidden grid-cols-[10rem_repeat(7,minmax(0,1fr))] gap-2 px-3 xl:grid">
        <span />
        {days.map(d => <span key={d} className="text-xs text-muted">{dayLabel(d).weekday} <b className="font-semibold text-ink">{dayLabel(d).day}</b></span>)}
      </div>
      {trainers.map(t => {
        const items = classes.filter(c => c.trainerId === t.id);
        return (
          <section key={t.id} aria-labelledby={`tr-${t.id}`} className="grid gap-2 rounded-2xl border border-line bg-surface/60 p-3 xl:grid-cols-[10rem_repeat(7,minmax(0,1fr))]">
            <header className="flex items-center gap-2 xl:flex-col xl:items-start">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
              <h2 id={`tr-${t.id}`} className="font-semibold"><Link href={`/trainers/${t.id}`} className="tap inline-block hover:underline">{t.nickname}</Link></h2>
              <span className="ml-auto text-xs text-muted xl:ml-0">{items.length} คลาส</span>
            </header>
            {days.map(d => {
              const dayItems = items.filter(c => dateOf(c) === d);
              return (
                <div key={d} className={`flex min-w-0 flex-col gap-2 ${dayItems.length === 0 ? 'hidden xl:flex' : ''}`}>
                  <span className="text-xs text-muted xl:hidden">{dayLabel(d).weekday} {dayLabel(d).day}</span>
                  {dayItems.map(c => <ClassChip key={c.id} c={c} href={`/classes/${c.id}`} />)}
                  {dayItems.length === 0 && <span aria-hidden className="rounded-xl border border-dashed border-line/70 p-3 text-center text-xs text-faint">—</span>}
                </div>
              );
            })}
            {items.length === 0 && <p className="text-sm text-faint xl:hidden">ไม่มีคลาสสัปดาห์นี้</p>}
          </section>
        );
      })}
    </div>
  );
}
