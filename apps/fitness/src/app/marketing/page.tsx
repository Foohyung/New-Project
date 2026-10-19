import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import { Send } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { DateRangeFilter } from '@/components/date-range-filter';
import { monthStart, parseRange, rangeLabel, sameRange } from '@/features/shared/date-range';
import { today } from '@/server/clock';
import { RoundEditor } from '@/components/marketing';
import { MarketingTabs } from '@/components/marketing-tabs';
import { Badge, Card, EmptyState, Forbidden, PageHeader, Stat, type Tone } from '@/components/ui';
import { CHANNEL_LABEL } from '@/features/reminders/service';
import { runRemindersAction, updateRoundAction } from '@/features/reminders/actions';
import { listCoupons } from '@/server/dal/coupons';
import { getReminderCenter } from '@/server/dal/reminders';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'แจ้งเตือนต่ออายุ' };

const OUTCOME: Record<string, { label: string; tone: Tone }> = {
  sent: { label: 'ส่งแล้ว', tone: 'muted' },
  clicked: { label: 'กดลิงก์', tone: 'cyan' },
  pending: { label: 'รอชำระ', tone: 'warn' },
  paid: { label: 'จ่ายแล้ว', tone: 'lime' },
};

export default async function RemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('marketing.manage');
  if (!allowed) return <Forbidden />;
  const date = today();
  const defaultRange = { from: monthStart(date), to: date };
  const range = parseRange(await searchParams, date, defaultRange) ?? defaultRange;
  const isMonth = sameRange(range, defaultRange);
  const [center, coupons] = await Promise.all([getReminderCenter(session, range), listCoupons(session)]);
  const usable = coupons.filter(c => c.state === 'active' && c.kind === 'promo').map(c => ({ code: c.code, label: c.label }));
  const sample = center.rounds.find(r => r.id === 'before-3') ?? center.rounds[0];

  return (
    <>
      <PageHeader kicker={session.branch} title="การตลาด" />
      <MarketingTabs current="reminders" />

      <DateRangeFilter path="/marketing" params={isMonth ? {} : { from: range.from, to: range.to }} range={range} today={date} defaultRange={defaultRange} label="ช่วงผลการแจ้งเตือน" />

      <section aria-label="ผลการแจ้งเตือน" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label={isMonth ? 'ต่ออายุจากลิงก์ เดือนนี้' : 'ต่ออายุจากลิงก์ ในช่วงนี้'} value={formatBaht(center.stats.revenueSatang)} hint={`${String(center.stats.paidCount)} คน`} />
        <Stat label="ส่งข้อความแล้ว" value={center.stats.sent} hint={center.stats.byChannel} />
        <Stat label="กดลิงก์" value={`${String(center.stats.clickRate)}%`} hint="ของข้อความที่ส่ง" />
        <Stat label="ไม่ส่ง (ไม่ยินยอม)" value={center.excludedNoConsent} hint="ตาม PDPA โทรหาแทน" />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] xl:gap-5">
        <section aria-labelledby="rounds-title" className="flex min-w-0 flex-col gap-3">
          <h2 id="rounds-title" className="font-display text-lg font-semibold">รอบการส่ง <span className="text-sm font-normal text-muted">· ส่งอัตโนมัติทุกเช้า 09:00 (ไม่ส่งให้คนที่ตัดบัตรอัตโนมัติ พักสมาชิก หรือไม่ยินยอม)</span></h2>
          <div className="grid gap-3 md:grid-cols-2">
            {center.rounds.map(r => (
              <details key={r.id} className="group rounded-2xl border border-line bg-surface open:md:col-span-2 open:border-lime/40">
                <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <b className="font-display text-base font-semibold">{r.title}</b>
                    <Badge tone={r.enabled ? 'lime' : 'muted'}>{r.enabled ? 'เปิด' : 'ปิด'}</Badge>
                  </span>
                  <span className="text-sm text-muted">{r.hint} · {r.channels.length ? r.channels.map(c => CHANNEL_LABEL[c]).join(' + ') : 'ยังไม่เลือกช่องทาง'}{r.couponCode ? ` · คูปอง ${r.couponCode}` : ''}</span>
                  <span className="line-clamp-2 text-sm">{r.preview}</span>
                  <span className="text-sm font-semibold text-lime group-open:hidden">แก้ไข →</span>
                </summary>
                <div className="border-t border-line p-4">
                  <RoundEditor round={r} coupons={usable} action={updateRoundAction.bind(null, r.id)} />
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title="วันนี้ต้องส่ง" subtitle={`${String(center.due.length)} คนถึงรอบ`}>
            {center.due.length === 0 ? <p className="mb-3 text-sm text-muted">ไม่มีใครถึงรอบ หรือส่งไปแล้ววันนี้</p> : (
              <ul className="mb-3 divide-y divide-line">
                {center.due.map(d => (
                  <li key={d.memberId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0"><Link href={`/members/${d.memberId}`} className="tap block truncate font-medium hover:underline">{d.name}</Link><span className="text-xs text-muted">{d.roundTitle} · หมด {formatThaiDate(d.expiresOn)}</span></div>
                    <Badge tone="cyan">{d.channels}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <ActionButton action={runRemindersAction} label="ส่งรอบวันนี้เลย" pendingLabel="กำลังส่ง…" variant="primary" />
          </Card>

          {sample && (
            <figure className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[34px] border-8 border-[#20242c] bg-[#8cabd9]" aria-label="ตัวอย่างข้อความ LINE">
              <figcaption className="flex items-center gap-2 bg-[#2b3446] px-3.5 py-2.5 text-sm font-semibold text-white">
                <span aria-hidden className="grid size-7 place-items-center rounded-full bg-lime font-display text-xs text-bg">FF</span>FitFlow {session.branch}
              </figcaption>
              <div className="grid gap-2 p-3 text-sm text-[#1d2129]">
                <span className="text-[10px] text-[#3b4a63]">ตัวอย่างรอบ &ldquo;{sample.title}&rdquo;</span>
                <p className="rounded-[4px_16px_16px_16px] bg-white p-3">{sample.preview}</p>
                <span className="rounded-xl bg-[#06C755] p-2.5 text-center font-semibold text-white">ต่ออายุด้วย PromptPay</span>
              </div>
            </figure>
          )}
        </div>
      </div>

      <Card title="ประวัติการส่ง" subtitle={rangeLabel(range)}>
        {center.logs.length === 0 ? <EmptyState>ไม่มีการส่งในช่วงนี้</EmptyState> : (
          <ul className="divide-y divide-line">
            {center.logs.map(l => (
              <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 text-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                <div className="min-w-0"><Link href={`/members/${l.memberId}`} className="tap block truncate font-medium hover:underline">{l.name}</Link><span className="text-xs text-muted sm:hidden">{l.roundTitle} · {l.channels}</span></div>
                <span className="hidden text-muted sm:block">{l.roundTitle} · {l.channels} · {formatThaiDateOf(l.sentAt)} {formatThaiTime(l.sentAt)}</span>
                <Badge tone={OUTCOME[l.outcome]?.tone ?? 'muted'}>{OUTCOME[l.outcome]?.label ?? l.outcome}</Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-2 text-xs text-faint"><Send aria-hidden className="size-3.5" />ระยะที่ 1 จำลองการส่ง · ระยะที่ 2 ส่งผ่าน LINE Messaging API และ SMS gateway</p>
      </Card>
    </>
  );
}
