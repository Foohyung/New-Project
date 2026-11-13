import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSaleReceipt } from '@/api/dal/sales/sales/sales.dal';
import { paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { shopProfile } from '@/api/dal/payments/payments/payments.shop';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatThaiTime } from '@/api/lib/utils/utils/utils';
import { AutoPrint } from '@/web/components/payments/payments/auto-print';
import { PrintButton } from '@/web/components/ui/ui/ui.print-button';
import { SimpleReceiptDocument } from '@/web/components/payments/payments/payments.receipt';
import { PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'ใบเสร็จสินค้า' };

export default async function SaleReceiptPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed } = await pageGuard('sales.use');
  if (!allowed) return accessDenied();
  const data = await getSaleReceipt(session, (await params).id);
  if (!data || data.sale.voidedAt) notFound();
  const { sale, branch } = data;
  const setup = await paymentSetupForBranch(branch);
  const shouldPrint = (await searchParams).print === '1';

  return (
    <>
      <AutoPrint enabled={shouldPrint} />
      <div className="print:hidden">
        <PageHeader
          back={{ href: '/sales', label: 'ประวัติการซื้อ' }}
          kicker={`${sale.receiptNo} · ${formatThaiTime(sale.createdAt)} น.`}
          title="ใบเสร็จรับเงิน"
          actions={<PrintButton />}
        />
      </div>
      <SimpleReceiptDocument
        receiptNo={sale.receiptNo}
        issuedAt={sale.createdAt}
        method={sale.method}
        customer={session.role === 'member' ? session.name : 'ลูกค้าหน้าร้าน'}
        receivedBy={sale.soldBy}
        lines={[
          ...sale.items.map(item => ({ description: item.name, quantity: item.qty, unitSatang: item.priceSatang })),
          ...(sale.discountSatang > 0 ? [{ description: `ส่วนลดคูปอง ${sale.couponCode ?? ''}`.trim(), quantity: 1, unitSatang: -sale.discountSatang }] : []),
        ]}
        amountSatang={sale.totalSatang}
        shop={await shopProfile(branch, setup)}
      />
    </>
  );
}
