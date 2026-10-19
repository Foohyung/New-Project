import { formatBaht } from '@repo/utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { PaymentStatusBadge } from '@/components/payments';
import { PrintButton } from '@/components/print-button';
import { ReceiptDocument } from '@/components/receipt';
import { Card, Forbidden, InfoList, PageHeader } from '@/components/ui';
import { confirmPaymentAction, submitSlipAction } from '@/features/payments/actions';
import { METHOD_LABEL } from '@/features/payments/service';
import { getPayment } from '@/server/dal/payments';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';
import { shopProfile } from '@/server/shop';

export const metadata: Metadata = { title: 'ใบเสร็จ' };

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('payments.view');
  if (!allowed) return <Forbidden />;
  const p = await getPayment(session, (await params).id);
  if (!p) notFound();
  const created = (await searchParams).created === '1';
  const paid = p.status === 'paid';

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ href: '/payments', label: 'การเงิน' }}
          kicker={p.receiptNo}
          title={paid ? 'ใบเสร็จรับเงิน' : 'รอชำระเงิน'}
          actions={<PrintButton label={paid ? 'พิมพ์ใบเสร็จ' : 'พิมพ์ใบแจ้งชำระ'} />}
        />
      </div>
      {created && !paid && <p role="status" className="rounded-2xl border border-lime/40 bg-lime/10 p-4 font-semibold text-lime print:hidden">สมัครสมาชิกแล้ว ให้สมาชิกสแกน QR ด้านล่างเพื่อชำระ สิทธิ์เริ่มทันทีที่ยืนยันเงินเข้า</p>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,210mm)_minmax(16rem,1fr)] xl:gap-5 print:block">
        <ReceiptDocument payment={p} shop={shopProfile(session.branch)} memberHref={`/members/${p.memberId}`} />

        <aside className="flex flex-col gap-4 print:hidden">
          {paid ? (
            <Card title="สรุปการรับชำระ" action={<PaymentStatusBadge status={p.status} />}>
              <InfoList items={[
                ['ยอดเงิน', formatBaht(p.amountSatang, { showSatang: true })],
                ['ช่องทาง', METHOD_LABEL[p.method]],
                ['ผู้รับเงิน', p.receivedBy ?? '—'],
              ]} />
              <p className="mt-4 text-sm text-muted">กดพิมพ์แล้วเลือก &quot;บันทึกเป็น PDF&quot; เพื่อส่งให้สมาชิกทางแชตได้</p>
            </Card>
          ) : (
            <Card title="ขั้นตอนถัดไป" action={<PaymentStatusBadge status={p.status} />}>
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>สมาชิกสแกน QR บนใบแจ้งด้วยแอปธนาคาร</li>
                <li>ตรวจยอดเข้าบัญชีร้าน (ระยะที่ 2 ตรวจสลิปอัตโนมัติ)</li>
                <li>กดยืนยัน ระบบต่ออายุให้ทันที</li>
              </ol>
              <div className="flex flex-col gap-2">
                {p.status === 'pending' && <ActionButton action={submitSlipAction.bind(null, p.id)} label="สมาชิกแจ้งโอนแล้ว" />}
                {can(session, 'payments.confirm') && <ActionButton action={confirmPaymentAction.bind(null, p.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับเงิน ${formatBaht(p.amountSatang)} แล้ว?`} />}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
