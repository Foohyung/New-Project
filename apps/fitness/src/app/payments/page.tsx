import { bangkokDate, formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import { Banknote, CalendarDays, CreditCard, Landmark, LayoutGrid, QrCode, RefreshCw, Table2, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { ActionButton } from '@/components/action-button';
import { DateRangeFilter } from '@/components/date-range-filter';
import { parseRange, rangeLabel } from '@/features/shared/date-range';
import { PaymentStatusBadge } from '@/components/payments';
import { btn, EmptyState, Forbidden, PageHeader, Stat } from '@/components/ui';
import { UrlDropdown } from '@/components/url-dropdown';
import { hrefWith, Toolbar, ViewSwitch } from '@/components/view-switch';
import { confirmPaymentAction } from '@/features/payments/actions';
import { METHOD_LABEL, PAYMENT_STATUS_LABEL, type PaymentMethod } from '@/features/payments/service';
import { KIND_LABEL, type PaymentDto } from '@/features/payments/types';
import { today } from '@/server/clock';
import { listPayments, paymentSummary } from '@/server/dal/payments';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'การเงิน' };

const VIEWS = ['table', 'cards', 'daily'] as const;
const METHODS = ['promptpay', 'card', 'cash', 'transfer'] as const;

const SearchParams = z.object({
  status: z.enum(['pending', 'review', 'paid']).optional().catch(undefined),
  view: z.enum(VIEWS).catch('table'),
  method: z.enum(METHODS).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});
const TABS = [undefined, 'review', 'pending', 'paid'] as const;

const VIEW_OPTIONS = [
  { value: 'table', label: 'ตาราง', icon: <Table2 className="size-4" /> },
  { value: 'cards', label: 'การ์ด', icon: <LayoutGrid className="size-4" /> },
  { value: 'daily', label: 'รายวัน', icon: <CalendarDays className="size-4" /> },
];

const METHOD_ICON: Record<PaymentMethod, ReactNode> = {
  promptpay: <QrCode className="size-4" />,
  card: <CreditCard className="size-4" />,
  cash: <Banknote className="size-4" />,
  transfer: <Landmark className="size-4" />,
};

const when = (p: PaymentDto) => `${formatThaiDateOf(p.createdAt)} ${formatThaiTime(p.createdAt)} น.`;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('payments.view');
  if (!allowed) return <Forbidden />;
  const { status, view, method, from, to } = SearchParams.parse(await searchParams);
  const range = parseRange({ from, to }, today());
  const [rows, summary, all] = await Promise.all([listPayments(session, { status, method, range }), paymentSummary(session), listPayments(session, { method, range })]);
  const canConfirm = can(session, 'payments.confirm');
  const count = (s?: (typeof TABS)[number]) => (s ? all.filter(p => p.status === s).length : all.length);
  const current = { status, method, view: view === 'table' ? undefined : view, from: range?.from, to: range?.to };
  const href = (patch: Record<string, string | undefined>) => hrefWith('/payments', current, patch);

  const action = (p: PaymentDto) =>
    canConfirm && p.status !== 'paid' ? (
      <ActionButton action={confirmPaymentAction.bind(null, p.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับเงิน ${formatBaht(p.amountSatang)} จาก ${p.memberName} แล้ว?`} />
    ) : (
      <Link href={`/payments/${p.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold whitespace-nowrap text-lime">{p.status === 'paid' ? 'ใบเสร็จ' : 'ดู QR'}</Link>
    );

  return (
    <>
      <PageHeader kicker={session.branch} title="การเงิน" actions={<Link href="/payments/subscriptions" className={btn.secondary}><RefreshCw aria-hidden className="size-5" />ตัดบัตรอัตโนมัติ</Link>} />
      <section aria-label="สรุปวันนี้" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รับเงินวันนี้" value={formatBaht(summary.todaySatang)} hint={`${String(summary.todayCount)} รายการ`} />
        <Stat label="รอตรวจสลิป" value={summary.review} hint="ตรวจยอดแล้วกดยืนยัน" />
        <Stat label="รอชำระ" value={summary.pending} hint="ส่ง QR ให้สมาชิกแล้ว" />
        <Stat label="รายการในช่วงนี้" value={all.length} hint={rangeLabel(range)} />
      </section>

      <nav aria-label="กรองตามสถานะ" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <Link
            key={tab ?? 'all'}
            href={href({ status: tab })}
            aria-current={status === tab ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg"
          >
            {tab ? PAYMENT_STATUS_LABEL[tab] : 'ทั้งหมด'}
            <span className="rounded-full bg-black/20 px-2 text-xs">{count(tab)}</span>
          </Link>
        ))}
      </nav>

      <DateRangeFilter path="/payments" params={current} range={range} today={today()} label="วันที่ทำรายการ" allowAll />

      <Toolbar>
        <ViewSwitch views={VIEW_OPTIONS} current={view} hrefFor={v => href({ view: v === 'table' ? undefined : v })} />
        <div className="ml-auto">
          <UrlDropdown
            label="ช่องทาง"
            align="end"
            value={method ?? ''}
            options={[
              { value: '', label: 'ทุกช่องทาง', icon: <Wallet className="size-4" />, href: href({ method: undefined }) },
              ...METHODS.map(m => ({ value: m, label: METHOD_LABEL[m], icon: METHOD_ICON[m], href: href({ method: m }) })),
            ]}
          />
        </div>
      </Toolbar>

      {rows.length === 0 ? <EmptyState>ไม่มีรายการตามเงื่อนไขนี้</EmptyState> : view === 'cards' ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(p => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/payments/${p.id}`} className="tap block truncate font-semibold hover:underline">{p.memberName}</Link>
                  <p className="text-xs text-muted">{p.receiptNo}</p>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
              <p className="font-display text-2xl font-semibold">{formatBaht(p.amountSatang)}</p>
              <p className="text-sm text-muted">{KIND_LABEL[p.kind]} · {p.packageName}</p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted">
                <span className="flex min-w-0 items-center gap-1.5"><span aria-hidden className="flex">{METHOD_ICON[p.method]}</span>{when(p)}</span>
                {action(p)}
              </div>
            </li>
          ))}
        </ul>
      ) : view === 'daily' ? (
        <DailyView rows={rows} />
      ) : (
        <>
          {/* มือถือ: การ์ดแถวเดียว (§15.2.4) */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map(p => (
              <li key={p.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/payments/${p.id}`} className="tap block truncate font-medium hover:underline">{p.memberName}</Link>
                    <p className="text-xs text-muted">{p.receiptNo} · {KIND_LABEL[p.kind]} {p.packageName}</p>
                  </div>
                  <b className="font-display text-lg">{formatBaht(p.amountSatang)}</b>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-muted"><PaymentStatusBadge status={p.status} />{METHOD_LABEL[p.method]}</span>
                  {action(p)}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="text-xs text-faint">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">สมาชิก</th>
                  <th scope="col" className="px-5 py-3 font-medium">รายการ</th>
                  <th scope="col" className="px-5 py-3 font-medium">ช่องทาง</th>
                  <th scope="col" className="px-5 py-3 font-medium">วันเวลา</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">ยอด</th>
                  <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">จัดการ</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(p => (
                  <tr key={p.id} className="hover:bg-surface-2/50">
                    <th scope="row" className="px-5 py-3 text-left font-normal">
                      <Link href={`/payments/${p.id}`} className="tap block font-medium hover:underline">{p.memberName}</Link>
                      <small className="text-xs text-muted">{p.receiptNo}</small>
                    </th>
                    <td className="px-5 py-3">{KIND_LABEL[p.kind]}<small className="block text-xs text-muted">{p.packageName}</small></td>
                    <td className="px-5 py-3"><span className="flex items-center gap-1.5 text-muted"><span aria-hidden className="flex">{METHOD_ICON[p.method]}</span>{METHOD_LABEL[p.method]}</span></td>
                    <td className="px-5 py-3 text-muted">{when(p)}</td>
                    <td className="px-5 py-3 text-right font-display text-base font-semibold tabular-nums">{formatBaht(p.amountSatang)}</td>
                    <td className="px-5 py-3"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-right">{action(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/** รายวัน: จัดกลุ่มตามวันที่ (เวลาไทย) พร้อมยอดรับจริงของแต่ละวัน */
function DailyView({ rows }: { rows: PaymentDto[] }) {
  const groups = new Map<string, PaymentDto[]>();
  for (const p of rows) {
    const date = bangkokDate(new Date(p.createdAt));
    groups.set(date, [...(groups.get(date) ?? []), p]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([date, items]) => {
        const paid = items.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amountSatang, 0);
        return (
          <section key={date} aria-labelledby={`day-${date}`} className="rounded-2xl border border-line bg-surface">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
              <h2 id={`day-${date}`} className="font-display text-lg font-semibold">{formatThaiDate(date, 'long')}</h2>
              <p className="text-sm text-muted">{items.length} รายการ · รับแล้ว <b className="font-display text-base text-lime">{formatBaht(paid)}</b></p>
            </header>
            <ol className="divide-y divide-line">
              {items.map(p => (
                <li key={p.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="text-sm text-muted tabular-nums">{formatThaiTime(p.createdAt)}</span>
                  <div className="min-w-0">
                    <Link href={`/payments/${p.id}`} className="tap block truncate font-medium hover:underline">{p.memberName}</Link>
                    <p className="truncate text-xs text-muted">{KIND_LABEL[p.kind]} {p.packageName} · {METHOD_LABEL[p.method]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <b className="font-display tabular-nums">{formatBaht(p.amountSatang)}</b>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
