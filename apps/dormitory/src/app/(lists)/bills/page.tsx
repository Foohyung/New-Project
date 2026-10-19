import { formatBaht, formatThaiDate } from '@repo/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { STATUS_BADGE } from '@/components/rooms';
import { ROOM_STATUS_LABEL } from '@/features/rooms/types';
import { requireSession } from '@/server/auth';
import { listInvoices } from '@/server/dal/rooms';

export const metadata: Metadata = { title: 'บิล' };

const Params = z.object({ status: z.enum(['paid', 'slip', 'overdue']).optional().catch(undefined) });
const TABS = [undefined, 'overdue', 'slip', 'paid'] as const;

export default async function BillsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const { status } = Params.parse(await searchParams);
  const [rows, all] = await Promise.all([listInvoices(session, status), listInvoices(session)]);
  const count = (s?: (typeof TABS)[number]) => (s ? all.filter(i => i.status === s).length : all.length);
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <>
      <header>
        <p className="text-sm text-muted">รอบบิล ต.ค. 2569</p>
        <h1 className="font-display text-2xl font-medium">บิลและการรับชำระ</h1>
      </header>

      <nav aria-label="กรองตามสถานะ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <Link
            key={tab ?? 'all'}
            href={tab ? `/bills?status=${tab}` : '/bills'}
            aria-current={status === tab ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-line bg-surface px-4 font-semibold aria-[current=page]:border-green aria-[current=page]:bg-green aria-[current=page]:text-white"
          >
            {tab ? ROOM_STATUS_LABEL[tab] : 'ทั้งหมด'} <span className="text-sm opacity-80">{count(tab)}</span>
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">{rows.length} ใบ · รวม {formatBaht(total)}</p>

      {rows.length === 0 ? (
        <p className="rounded-[22px] border-2 border-dashed border-line p-10 text-center text-muted">ไม่มีบิลในสถานะนี้</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map(r => (
              <li key={r.invoiceNo}>
                <Link href={`/rooms/${r.roomNo}`} className="flex items-center gap-3 rounded-[22px] bg-surface p-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint font-display font-medium text-green-deep">{r.roomNo}</span>
                  <span className="min-w-0 flex-1">คุณ{r.tenantNickname}<small className="block text-xs text-muted">{r.invoiceNo}</small></span>
                  <span className="text-right">
                    <b className="block font-display font-medium">{formatBaht(r.total)}</b>
                    <span className={`rounded-full px-2 text-xs font-semibold ${STATUS_BADGE[r.status]}`}>{ROOM_STATUS_LABEL[r.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-[22px] bg-surface md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th scope="col" className="sticky left-0 bg-surface px-5 py-3 font-medium">ห้อง</th>
                  <th scope="col" className="px-5 py-3 font-medium">เลขที่</th>
                  <th scope="col" className="px-5 py-3 font-medium">ผู้เช่า</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">ยอด</th>
                  <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
                  <th scope="col" className="px-5 py-3 font-medium">ชำระเมื่อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(r => (
                  <tr key={r.invoiceNo}>
                    <th scope="row" className="sticky left-0 bg-surface px-5 py-3 text-left font-display font-medium">
                      <Link href={`/rooms/${r.roomNo}`} className="inline-flex min-h-11 min-w-11 items-center text-green-deep underline underline-offset-4">{r.roomNo}</Link>
                    </th>
                    <td className="px-5 py-3 text-muted tabular-nums">{r.invoiceNo}</td>
                    <td className="px-5 py-3">คุณ{r.tenantNickname}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatBaht(r.total)}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_BADGE[r.status]}`}>{ROOM_STATUS_LABEL[r.status]}</span></td>
                    <td className="px-5 py-3 text-muted">{r.paidAt ? formatThaiDate(r.paidAt.slice(0, 10)) : '—'}</td>
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
