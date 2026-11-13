import { formatBaht, formatThaiDateOf } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { PaymentStatusBadge } from '@/web/components/payments/payments/payments';
import { PrintButton } from '@/web/components/ui/ui/ui.print-button';
import { ReceiptDocument } from '@/web/components/payments/payments/payments.receipt';
import { Card, InfoList, PageHeader } from '@/web/components/ui/ui/ui';
import { confirmPaymentAction, submitSlipAction } from '@/api/actions/payments/payments/payments.actions';
import { METHOD_LABEL } from '@/api/services/payments/payments/payments.service';
import { getPayment, paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { can } from '@/api/lib/auth/auth/auth.rbac';
import { shopProfile } from '@/api/dal/payments/payments/payments.shop';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { AutoPrint } from '@/web/components/payments/payments/auto-print';
import Image from 'next/image';

export const metadata: Metadata = { title: 'ใบเสร็จ' };

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('payments.view');
  if (!allowed) return accessDenied();
  const p = await getPayment(session, (await params).id);
  if (!p) notFound();
  const paymentBranch = p.branch ?? session.branch;
  const paymentSetup = await paymentSetupForBranch(paymentBranch);
  const query = await searchParams;
  const created = query.created === '1';
  const paid = p.status === 'paid';
  const shouldPrint = paid && query.print === '1';

  return (
    <>
      <AutoPrint enabled={shouldPrint} />
      <div className="print:hidden">
        <PageHeader
          back={{ href: '/payments', label: 'การเงิน' }}
          kicker={p.receiptNo}
          title={paid ? 'ใบเสร็จรับเงิน' : 'รอชำระเงิน'}
          actions={<PrintButton label={paid ? 'พิมพ์ใบเสร็จ' : 'พิมพ์ใบแจ้งชำระ'} downloadable={paid} />}
        />
      </div>
      {created && !paid && <p role="status" className="rounded-2xl border border-lime/40 bg-lime/10 p-4 font-semibold text-lime print:hidden">สมัครสมาชิกแล้ว ให้สมาชิกสแกน QR ด้านล่างเพื่อชำระ ระบบจะเปิดสิทธิ์ตามช่วงวันที่สมัครหลังยืนยันเงินเข้า</p>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,210mm)_minmax(16rem,1fr)] xl:gap-5 print:block">
        <ReceiptDocument payment={p} shop={await shopProfile(paymentBranch, paymentSetup)} memberHref={`/members/${p.memberId}`} />

        <aside className="flex flex-col gap-4 print:hidden">
          {p.hasSlip && (
            <Card title="สลิปจากสมาชิก">
              <a href={`/api/payments/${encodeURIComponent(p.id)}/slip`} target="_blank" rel="noreferrer" className="tap block w-fit">
                <Image src={`/api/payments/${encodeURIComponent(p.id)}/slip`} alt={`สลิป ${p.receiptNo}`} width={320} height={420} unoptimized className="max-h-96 w-auto rounded-xl border border-line object-contain" />
                <span className="mt-2 block text-sm text-lime underline underline-offset-2">เปิดรูปสลิปขนาดเต็ม</span>
              </a>
            </Card>
          )}
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
              {p.paymentDate && <p className="mb-3 text-sm text-muted">วันที่ชำระที่บันทึกไว้: {formatThaiDateOf(p.paymentDate)}</p>}
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
