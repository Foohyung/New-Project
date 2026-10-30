import { formatBaht, formatThaiDate, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { Bell, ScanLine, Search } from 'lucide-react';
import Link from 'next/link';
import type { ClassDto } from '@/api/types/classes/classes/classes.types';
import { remindMemberAction } from '@/api/actions/members/members/members.actions';
import type { MemberDto } from '@/api/types/members/members/members.types';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Avatar, Card } from '@/web/components/ui/ui/ui';
import { CountUp } from '@/web/components/layout/layout/layout.motion';

export function Topbar({ dateText, greeting }: { dateText: string; greeting: string }) {
  return (
    <header className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div>
        <p className="text-sm text-muted">{dateText}</p>
        <h1 className="font-display text-2xl font-semibold lg:text-[28px]">{greeting}</h1>
      </div>
      <div className="flex gap-2.5 md:min-w-[380px]">
        <form action="/members" method="get" role="search" className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-muted">
          <Search aria-hidden className="size-5 shrink-0" />
          <label htmlFor="top-q" className="sr-only">ค้นหาสมาชิก</label>
          <input id="top-q" name="q" type="search" placeholder="ค้นหาสมาชิก เบอร์โทร หรือรหัส" className="min-h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint" />
        </form>
        <Link href="/payments?status=review" aria-label="รายการรอตรวจสลิป" className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-surface">
          <Bell aria-hidden className="size-5" />
          <span className="absolute top-3 right-3 size-2 rounded-full border-2 border-surface bg-danger" />
        </Link>
        <Link href="/checkin" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-lime px-4 font-semibold text-bg hover:brightness-110">
          <ScanLine aria-hidden className="size-5" />
          <span className="sr-only sm:not-sr-only">สแกนเช็กอิน</span>
        </Link>
      </div>
    </header>
  );
}

interface KpiData {
  inGym: { now: number; capacity: number };
  checkInsToday: { count: number; changePct: number };
  activeMembers: { count: number; newThisMonth: number };
  revenueMonth: { satang: number; changePct: number; pendingSlips: number } | null;
  classes: ClassDto[];
}

const num = new Intl.NumberFormat('th-TH');

export function KpiGrid({ data, dateLabel }: { data: KpiData; dateLabel: string }) {
  const chip = 'rounded-full bg-lime/12 px-2 py-0.5 text-xs font-semibold text-lime';
  return (
    <section aria-label="ตัวเลขสำคัญวันนี้" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="ff-sheen flex flex-col gap-1 rounded-2xl bg-lime p-5 text-bg">
        <span className="inline-flex items-center gap-2 text-sm text-bg/75">
          <span aria-hidden className="ff-live size-2 rounded-full bg-bg" />
          กำลังอยู่ในยิม
        </span>
        <CountUp className="font-display text-4xl font-semibold" text={`${String(data.inGym.now)} คน`} />
        <span className="text-sm text-bg/75">ความจุ {data.inGym.capacity} คน · ช่วงพีค 18:00–20:00</span>
      </div>
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5">
        <span className="text-sm text-muted">เช็กอินวันนี้</span>
        <CountUp className="font-display text-4xl font-semibold" text={num.format(data.checkInsToday.count)} />
        <span className="text-sm text-muted"><span className={chip}>▲ {data.checkInsToday.changePct}%</span> จากสัปดาห์ก่อน</span>
      </div>
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5">
        <span className="text-sm text-muted">สมาชิกที่ใช้งาน</span>
        <CountUp className="font-display text-4xl font-semibold" text={num.format(data.activeMembers.count)} />
        <span className="text-sm text-muted"><span className={chip}>+{data.activeMembers.newThisMonth}</span> สมาชิกใหม่เดือนนี้</span>
      </div>
      {data.revenueMonth ? (
        <Link href="/reports" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5 hover:border-muted">
          <span className="text-sm text-muted">รายได้เดือนนี้</span>
          <CountUp className="font-display text-4xl font-semibold" text={formatBaht(data.revenueMonth.satang)} />
          <span className="text-sm text-muted"><span className={chip}>▲ {data.revenueMonth.changePct}%</span> ถึง {dateLabel}{data.revenueMonth.pendingSlips > 0 && ` · สลิปรอตรวจ ${String(data.revenueMonth.pendingSlips)}`}</span>
        </Link>
      ) : (
        <Link href="/classes" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5 hover:border-muted">
          <span className="text-sm text-muted">คลาสที่เหลือวันนี้</span>
          <span className="font-display text-4xl font-semibold">{data.classes.length} คลาส</span>
          <span className="text-sm text-muted">ว่าง {data.classes.reduce((s, c) => s + Math.max(0, c.capacity - c.booked), 0)} ที่นั่ง</span>
        </Link>
      )}
    </section>
  );
}

export function HourlyChart({ hourly, currentHour }: { hourly: [number, number, number?][]; currentHour: number }) {
  const max = Math.max(...hourly.map(([, v, f]) => Math.max(v, f ?? 0))) * 1.1;
  const peak = hourly.reduce((best, row) => ((row[2] ?? row[1]) > (best[2] ?? best[1]) ? row : best));
  const total = hourly.reduce((sum, [h, v]) => (h <= currentHour ? sum + v : sum), 0);
  return (
    <Card title="เช็กอินรายชั่วโมง" subtitle="ชั่วโมงที่เหลือเป็นค่าคาดการณ์จาก 4 สัปดาห์ล่าสุด">
      <div aria-hidden className="flex h-52 items-end gap-[3px] border-b border-dashed border-line pt-8 sm:gap-2">
        {hourly.map(([hour, value, forecast]) => {
          const isNow = hour === currentHour;
          const isFuture = hour > currentHour;
          const height = ((isNow || isFuture ? (forecast ?? value) : value) / max) * 100;
          return (
            <div key={hour} className="flex h-full flex-1 items-end justify-center">
              <div
                style={{ height: `${height}%` }}
                className={`relative w-full max-w-[30px] rounded-t-md ${isNow ? 'bg-lime/15 outline-1 outline-lime/50 outline-dashed' : isFuture ? 'bg-[repeating-linear-gradient(135deg,#1d2229_0_6px,#262c35_6px_12px)]' : 'bg-gradient-to-b from-[#3b4350] to-[#262c35]'}`}
              >
                {isNow && forecast && (
                  <>
                    <span style={{ height: `${(value / forecast) * 100}%` }} className="absolute inset-x-0 bottom-0 rounded-t-md bg-lime shadow-[0_0_24px_color-mix(in_oklab,var(--color-lime)_40%,transparent)]" />
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-lime px-1.5 text-[11px] font-bold whitespace-nowrap text-bg">
                      {value} / ~{forecast}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex gap-[3px] sm:gap-2">
        {hourly.map(([hour]) => (
          <span key={hour} className={`flex-1 text-center text-[11px] ${hour === currentHour ? 'font-semibold text-lime' : 'text-faint'} ${hour % 2 && hour !== currentHour ? 'invisible sm:visible' : ''}`}>
            {String(hour).padStart(2, '0')}
          </span>
        ))}
      </div>
      {/* ข้อมูลเดียวกับกราฟในรูปแบบข้อความ — ไม่ต้องพึ่ง hover (§15.2.5) */}
      <p className="mt-3 text-sm text-muted">
        ช่วงพีควันนี้ {String(peak[0]).padStart(2, '0')}:00 · คาดการณ์ ~{peak[2] ?? peak[1]} คน/ชม. · เช็กอินแล้วทั้งวัน {total} คน
      </p>
    </Card>
  );
}

export interface FeedItem {
  memberId: string;
  name: string;
  packageName: string;
  at: string;
  allowed: boolean;
  expiresOn: string;
}

export function LiveFeed({ items }: { items: FeedItem[] }) {
  return (
    <Card title="เช็กอินล่าสุด" subtitle="อัปเดตทุกครั้งที่มีการเช็กอิน" action={<Link href="/checkin" className="inline-flex min-h-11 items-center text-sm font-semibold text-lime">ดูทั้งหมด</Link>}>
      <ul className="divide-y divide-line">
        {items.map(item => (
          <li key={item.name + item.at} className="flex items-center gap-3 py-2.5">
            <Avatar name={item.name} />
            <div className="min-w-0 flex-1">
              <Link href={`/members/${item.memberId}`} className="tap block truncate font-medium hover:underline">{item.name}</Link>
              <small className="text-xs text-muted">{item.allowed ? item.packageName : `ใช้ได้ถึง ${formatThaiDate(item.expiresOn)}`}</small>
            </div>
            <time className="text-xs text-faint tabular-nums">{formatThaiTime(item.at)}</time>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.allowed ? 'bg-lime/12 text-lime' : 'bg-danger/15 text-danger'}`}>{item.allowed ? 'ผ่าน' : 'ปฏิเสธ'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function classTime(c: { startsAt: string; minutes: number }): string {
  return `${formatThaiTime(c.startsAt)}–${formatThaiTime(new Date(new Date(c.startsAt).getTime() + c.minutes * 60_000))}`;
}

export function ClassesToday({ classes }: { classes: ClassDto[] }) {
  return (
    <Card title="คลาสวันนี้" subtitle={`${String(classes.length)} คลาสที่เหลือ`} action={<Link href="/classes" className="inline-flex min-h-11 items-center text-sm font-semibold text-lime">ตารางคลาส</Link>}>
      {classes.length === 0 && <p className="py-6 text-center text-sm text-muted">ไม่มีคลาสเหลือแล้ววันนี้</p>}
      <ul className="divide-y divide-line">
        {classes.map(c => {
          const full = c.booked >= c.capacity;
          return (
            <li key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/classes/${c.id}`} className="tap inline-block font-medium hover:underline">
                  {c.title}
                  {c.state === 'live' && <span className="ml-1.5 rounded-md bg-lime/12 px-2 py-0.5 text-[11px] font-semibold text-lime">กำลังเรียน</span>}
                  {full && <span className="ml-1.5 rounded-md bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger">เต็ม</span>}
                </Link>
                <small className="whitespace-nowrap text-muted">{c.booked}/{c.capacity}</small>
              </div>
              <p className="text-xs text-muted">{classTime(c)} · {c.trainerName} · {c.room}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={c.booked} aria-valuemax={c.capacity} aria-label={`จองแล้ว ${String(c.booked)} จาก ${String(c.capacity)}`}>
                <span style={{ width: `${Math.min(100, (c.booked / c.capacity) * 100)}%` }} className={`block h-full rounded-full ${full ? 'bg-danger' : 'bg-cyan'}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function ExpiringList({ members }: { members: MemberDto[] }) {
  return (
    <Card title="ใกล้หมดอายุใน 7 วัน" subtitle={`${String(members.length)} คน · เตือนผ่าน LINE OA`}>
      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">ไม่มีสมาชิกที่ใกล้หมดอายุ</p>
      ) : (
        <ul className="divide-y divide-line">
          {members.map(m => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <Link href={`/members/${m.id}`} className="tap block truncate font-medium hover:underline">{m.name}</Link>
                <small className="text-xs text-muted">{m.packageName} · {formatThaiDate(m.expiresOn)}</small>
              </div>
              <span className="font-display font-semibold whitespace-nowrap text-warn">{m.daysLeft === 0 ? 'วันนี้' : `อีก ${String(m.daysLeft)} วัน`}</span>
              <ActionButton action={remindMemberAction.bind(null, m.id)} label="ส่ง LINE" pendingLabel="กำลังส่ง…" variant="primary" className="max-w-36 items-end text-right" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PackageMix({ mix }: { mix: { name: string; count: number; color: string }[] }) {
  const total = mix.reduce((s, p) => s + p.count, 0);
  return (
    <Card title="แพ็กเกจที่ใช้งาน" subtitle="สัดส่วนสมาชิกตามแพ็กเกจ">
      <p className="font-display text-3xl font-semibold">{num.format(total)} <span className="font-sans text-sm text-muted">คน</span></p>
      <div aria-hidden className="my-3 flex h-3.5 gap-[3px] overflow-hidden rounded-full">
        {mix.map(p => <span key={p.name} style={{ flex: p.count, background: p.color }} />)}
      </div>
      <ul>
        {mix.map(p => (
          <li key={p.name} className="flex items-center gap-2.5 py-1.5">
            <i aria-hidden className="size-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="flex-1 text-muted">{p.name}</span>
            <b className="font-display font-semibold">{num.format(p.count)}</b>
            <em className="w-10 text-right text-xs text-faint not-italic">{Math.round((p.count / total) * 100)}%</em>
          </li>
        ))}
      </ul>
    </Card>
  );
}
