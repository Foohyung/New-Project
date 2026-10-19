import { formatBaht, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { ActionButton } from '@/components/action-button';
import { PaymentStatusBadge } from '@/components/payments';
import { EmptyState, Forbidden, PageHeader, Stat } from '@/components/ui';
import { confirmPaymentAction } from '@/features/payments/actions';
import { METHOD_LABEL, PAYMENT_STATUS_LABEL } from '@/features/payments/service';
import { KIND_LABEL } from '@/features/payments/types';
import { listPayments, paymentSummary } from '@/server/dal/payments';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'การเงิน' };

const SearchParams = z.object({ status: z.enum(['pending', 'review', 'paid']).optional().catch(undefined) });
const TABS = [undefined, 'review', 'pending', 'paid'] as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('payments.view');
  if (!allowed) return <Forbidden />;
  const { status } = SearchParams.parse(await searchParams);
  const [rows, summary, all] = await Promise.all([listPayments(session, { status }), paymentSummary(session), listPayments(session)]);
  const canConfirm = can(session, 'payments.confirm');
  const count = (s?: (typeof TABS)[number]) => (s ? all.filter(p => p.status === s).length : all.length);

  return (
    <>
      <PageHeader kicker={session.branch} title="การเงิน" />
      <section aria-label="สรุปวันนี้" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รับเงินวันนี้" value={formatBaht(summary.todaySatang)} hint={`${String(summary.todayCount)} รายการ`} />
        <Stat label="รอตรวจสลิป" value={summary.review} hint="ตรวจยอดแล้วกดยืนยัน" />
        <Stat label="รอชำระ" value={summary.pending} hint="ส่ง QR ให้สมาชิกแล้ว" />
        <Stat label="รายการทั้งหมด" value={all.length} hint="เดือนนี้" />
      </section>

      <nav aria-label="กรองตามสถานะ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <Link
            key={tab ?? 'all'}
            href={tab ? `/payments?status=${tab}` : '/payments'}
            aria-current={status === tab ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg"
          >
            {tab ? PAYMENT_STATUS_LABEL[tab] : 'ทั้งหมด'}
            <span className="rounded-full bg-black/20 px-2 text-xs">{count(tab)}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? <EmptyState>ไม่มีรายการในสถานะนี้</EmptyState> : (
        <ul className="flex flex-col gap-3">
          {rows.map(p => (
            <li key={p.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-center">
              <div className="min-w-0">
                <Link href={`/payments/${p.id}`} className="tap block truncate font-medium hover:underline">{p.memberName}</Link>
                <p className="text-xs text-muted">{p.receiptNo} · {KIND_LABEL[p.kind]} {p.packageName}</p>
              </div>
              <p className="text-sm text-muted">{formatThaiDateOf(p.createdAt)} {formatThaiTime(p.createdAt)} น. · {METHOD_LABEL[p.method]}</p>
              <div className="flex items-center gap-3 md:justify-end">
                <b className="font-display text-lg">{formatBaht(p.amountSatang)}</b>
                <PaymentStatusBadge status={p.status} />
              </div>
              <div className="md:justify-self-end">
                {canConfirm && p.status !== 'paid' ? (
                  <ActionButton action={confirmPaymentAction.bind(null, p.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับเงิน ${formatBaht(p.amountSatang)} จาก ${p.memberName} แล้ว?`} />
                ) : (
                  <Link href={`/payments/${p.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-lime">{p.status === 'paid' ? 'ใบเสร็จ' : 'ดู QR'}</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
