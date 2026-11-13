import type { Metadata } from 'next';
import { createSaleAction, voidSaleAction } from '@/api/actions/sales/sales/sales.actions';
import { listProducts, listSales, salesBranchOptions } from '@/api/dal/sales/sales/sales.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatBaht, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { METHOD_LABEL } from '@/api/services/payments/payments/payments.service';
import { PosRegister } from '@/web/components/sales/sales/sales.pos';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { ReceiptPrintLink } from '@/web/components/payments/payments/receipt-print-link';
import { Building2 } from 'lucide-react';
import { UrlDropdown } from '@/web/components/ui/ui/ui.url-dropdown';
import { hrefWith } from '@/web/components/ui/ui/ui.view-switch';
import { DateRangeFilter } from '@/web/components/ui/ui/ui.date-range-filter';
import { parseRange, rangeLabel, sameRange } from '@/api/services/shared/shared/shared.date-range';
import { today } from '@/api/lib/clock/clock/clock';

export const metadata: Metadata = { title: 'ขายสินค้า' };

/** ขายหน้าร้าน (POS) + บิลวันนี้ */
export default async function PosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('sales.use');
  if (!allowed) return accessDenied("บทบาทของคุณขายสินค้าหน้าร้านไม่ได้");
  const query = await searchParams;
  const date = today();
  const defaultRange = { from: date, to: date };
  const range = parseRange(query, date, defaultRange) ?? defaultRange;
  const branches = await salesBranchOptions(session);
  const requestedBranch = typeof query.branch === 'string' ? query.branch : undefined;
  const branch = session.role === 'admin' && requestedBranch && branches.includes(requestedBranch) ? requestedBranch : undefined;
  const params = {
    ...(sameRange(range, defaultRange) ? {} : { from: range.from, to: range.to }),
    ...(branch ? { branch } : {}),
  };
  const [products, sales, setup] = await Promise.all([
    listProducts(session, { activeOnly: true }),
    listSales(session, range, branch),
    paymentSetupForBranch(session.branch),
  ]);
  const valid = sales.filter(s => !s.voidedAt);
  const total = valid.reduce((s, x) => s + x.totalSatang, 0);
  const buyerMode = session.role === 'member';

  return (
    <>
      <PageHeader kicker={buyerMode ? 'เลือกสินค้าและจำนวนที่ต้องการซื้อ' : session.role === 'admin' ? `สต็อก POS · ${session.branch}` : `${session.branch} · กด − / + ที่สินค้าเพื่อเลือกจำนวน`} title={buyerMode ? 'ซื้อสินค้า' : 'ขายสินค้า'} />
      <PosRegister products={products} action={createSaleAction} buyerMode={buyerMode} setup={setup} />
      <DateRangeFilter path="/sales" params={params} range={range} today={date} defaultRange={defaultRange} label="วันที่ขาย" variant="dual" />
      {session.role === 'admin' && branches.length > 0 && (
        <div className="flex justify-end">
          <UrlDropdown
            label="สาขาประวัติขาย"
            align="end"
            value={branch ?? ''}
            options={[
              { value: '', label: 'ทุกสาขา', icon: <Building2 className="size-4" />, href: hrefWith('/sales', params, { branch: undefined }) },
              ...branches.map(name => ({ value: name, label: name, icon: <Building2 className="size-4" />, href: hrefWith('/sales', params, { branch: name }) })),
            ]}
          />
        </div>
      )}
      <Card title={buyerMode ? 'รายการซื้อ' : 'บิลขาย'} subtitle={`${rangeLabel(range)} · ${String(valid.length)} ${buyerMode ? 'รายการ' : 'บิล'} · รวม ${formatBaht(total)}${sales.length > valid.length ? ` · ยกเลิก ${String(sales.length - valid.length)} ${buyerMode ? 'รายการ' : 'บิล'}` : ''}`}>
        {sales.length === 0 ? <EmptyState>ไม่มีรายการขายในช่วงวันที่เลือก</EmptyState> : (
          <ul className="divide-y divide-line">
            {sales.map(s => (
              <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${s.voidedAt ? 'opacity-55' : ''}`}>
                <div className="min-w-0 text-sm">
                  <b className="block">{s.receiptNo} · {formatThaiTime(s.createdAt)} น. <span className="font-normal text-muted">· {METHOD_LABEL[s.method]}{s.soldBy && ` · ${s.soldBy}`}</span></b>
                  <span className="text-muted">{s.items.map(i => `${i.name} ×${String(i.qty)}`).join(', ')}</span>
                  {s.couponCode && <span className="block text-xs text-lime">คูปอง {s.couponCode} · ลด {formatBaht(s.discountSatang)}</span>}
                  {s.hasSlip && <a className="mt-1 block w-fit text-xs font-semibold text-lime underline" href={`/api/sales/${encodeURIComponent(s.id)}/slip`} target="_blank" rel="noreferrer">ดูสลิป</a>}
                </div>
                <div className="flex items-center gap-2">
                  <b className={`font-display text-lg ${s.voidedAt ? 'line-through' : ''}`}>{formatBaht(s.totalSatang)}</b>
                  {!s.voidedAt && <ReceiptPrintLink href={`/sales/receipt/${s.id}?print=1`} />}
                  {s.voidedAt ? <Badge tone="muted">ยกเลิกแล้ว{s.voidedByName && ` · ${s.voidedByName}`}</Badge> : !buyerMode && <ActionButton action={voidSaleAction.bind(null, s.id)} label="ยกเลิกบิล" variant="danger" confirm={`ยกเลิกบิล ${s.receiptNo} (${formatBaht(s.totalSatang)})? สินค้าจะถูกคืนเข้าสต็อก`} successTitle="ยกเลิกบิลแล้ว" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
