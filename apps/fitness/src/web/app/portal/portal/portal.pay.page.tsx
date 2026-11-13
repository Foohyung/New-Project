import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaymentSlipForm } from '@/web/components/payments/payments/payment-slip-form';
import { AutoPrint } from '@/web/components/payments/payments/auto-print';
import { PaymentStatusBadge } from '@/web/components/payments/payments/payments';
import { PromptPayCheckout } from '@/web/components/payments/payments/promptpay-checkout';
import { PrintButton } from '@/web/components/ui/ui/ui.print-button';
import { ReceiptDocument } from '@/web/components/payments/payments/payments.receipt';
import { Card, PageHeader } from '@/web/components/ui/ui/ui';
import { submitSlipAction } from '@/api/actions/payments/payments/payments.actions';
import { promptPayPayload } from '@/api/services/payments/payments/payments.service';
import { getPayment, paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { shopProfile } from '@/api/dal/payments/payments/payments.shop';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'ชำระเงิน' };

export default async function MyPaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return accessDenied("หน้านี้สำหรับสมาชิก");
  // DAL คืนเฉพาะรายการของสมาชิกคนนี้ — รหัสของคนอื่นจะได้ 404 (กัน IDOR)
  const p = await getPayment(session, (await params).id);
  if (!p) notFound();
  const paymentSetup = await paymentSetupForBranch(p.branch ?? session.branch);
  const shouldPrint = p.status === 'paid' && (await searchParams).print === '1';

  if (p.status === 'paid') {
    return (
      <>
        <AutoPrint enabled={shouldPrint} />
        <div className="print:hidden">
          <PageHeader back={{ href: '/me', label: 'บัตรสมาชิก' }} kicker={p.receiptNo} title="ใบเสร็จของฉัน" actions={<PrintButton label="พิมพ์ / บันทึก PDF" />} />
        </div>
        <ReceiptDocument payment={p} shop={await shopProfile(p.branch ?? session.branch, paymentSetup)} />
      </>
    );
  }

  return (
    <>
      <PageHeader back={{ href: '/me', label: 'บัตรสมาชิก' }} kicker={p.receiptNo} title="ชำระด้วย PromptPay" />
      <div className={`mx-auto grid w-full max-w-3xl gap-4 ${p.status === 'pending' ? 'md:grid-cols-2' : ''}`}>
        {p.status === 'pending' && (
          <PromptPayCheckout
            payload={paymentSetup.promptPayId ? promptPayPayload(paymentSetup.promptPayId, p.amountSatang) : undefined}
            qrImageUrl={paymentSetup.promptPayQrUrl}
            amountSatang={p.amountSatang}
            note={`${p.packageName} · ${p.receiptNo}`}
          />
        )}
        <Card title="สถานะ" action={<PaymentStatusBadge status={p.status} />}>
          {p.status === 'pending' && (
            <>
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>บันทึกภาพ QR หรือสแกนด้วยแอปธนาคาร</li>
                <li>ตรวจยอดเงินให้ตรงก่อนกดโอน</li>
                <li>กด &quot;ฉันโอนแล้ว&quot; ด้านล่าง</li>
              </ol>
              <PaymentSlipForm action={submitSlipAction.bind(null, p.id)} />
            </>
          )}
          {p.status === 'review' && <p className="text-sm text-muted">เจ้าหน้าที่กำลังตรวจยอด สิทธิ์จะต่อให้อัตโนมัติหลังตรวจเสร็จ (ปกติไม่เกิน 15 นาทีในเวลาทำการ)</p>}
        </Card>
      </div>
    </>
  );
}
