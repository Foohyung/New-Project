import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { cancelEnrollmentAction, submitEnrollmentSlipAction } from '@/api/actions/courses/courses/courses.actions';
import { getEnrollment } from '@/api/dal/courses/courses/courses.dal';
import { paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatBaht, formatThaiDateOf } from '@/api/lib/utils/utils/utils';
import { promptPayPayload } from '@/api/services/payments/payments/payments.service';
import { EnrollmentStatusBadge } from '@/web/components/courses/courses/courses.badges';
import { PromptPayCheckout } from '@/web/components/payments/payments/promptpay-checkout';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Card, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { PaymentSlipForm } from '@/web/components/payments/payments/payment-slip-form';
import { ReceiptPrintLink } from '@/web/components/payments/payments/receipt-print-link';

export const metadata: Metadata = { title: 'ชำระค่าคอร์ส' };

export default async function MyCoursePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return accessDenied("หน้านี้สำหรับสมาชิก");
  // DAL คืนเฉพาะรายการของสมาชิกคนนี้ — รหัสของคนอื่นจะได้ 404 (กัน IDOR)
  const e = await getEnrollment(session, (await params).id);
  if (!e) notFound();
  const back = { href: '/me/courses', label: 'คอร์สเรียน' };

  if (e.status === 'paid' || e.status === 'cancelled') {
    return (
      <>
        <PageHeader
          back={back}
          kicker={e.receiptNo}
          title={e.courseTitle}
          actions={e.status === 'paid' ? <ReceiptPrintLink href={`/courses/receipt/${e.id}?print=1`} /> : undefined}
        />
        <Card className="mx-auto w-full max-w-md text-center">
          {e.status === 'paid' ? (
            <div className="flex flex-col items-center gap-2">
              <CircleCheck aria-hidden className="size-12 text-lime" />
              <b className="font-display text-xl">สมัครเรียบร้อย</b>
              <p className="text-sm text-muted">ชำระ {formatBaht(e.amountSatang)} เมื่อ {e.paidAt ? formatThaiDateOf(e.paidAt) : '—'} · ใบเสร็จ {e.receiptNo}</p>
            </div>
          ) : <p className="text-sm text-muted">การสมัครนี้ถูกยกเลิกแล้ว สมัครใหม่ได้จากหน้าคอร์สเรียน</p>}
        </Card>
      </>
    );
  }

  const paymentSetup = await paymentSetupForBranch(session.branch);
  return (
    <>
      <PageHeader back={back} kicker={e.receiptNo} title={`ชำระค่าคอร์ส ${e.courseTitle}`} />
      <div className={`mx-auto grid w-full max-w-3xl gap-4 ${e.status === 'pending' ? 'md:grid-cols-2' : ''}`}>
        {e.status === 'pending' && (
          <PromptPayCheckout
            payload={paymentSetup.promptPayId ? promptPayPayload(paymentSetup.promptPayId, e.amountSatang) : undefined}
            qrImageUrl={paymentSetup.promptPayQrUrl}
            amountSatang={e.amountSatang}
            note={`${e.courseTitle} · ${e.receiptNo}`}
          />
        )}
        <Card title="สถานะ" action={<EnrollmentStatusBadge status={e.status} />}>
          {e.status === 'pending' && (
            <>
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>บันทึกภาพ QR หรือสแกนด้วยแอปธนาคาร</li>
                <li>ตรวจยอดเงินให้ตรงก่อนกดโอน</li>
                <li>กด &quot;ฉันโอนแล้ว&quot; ด้านล่าง</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <PaymentSlipForm action={submitEnrollmentSlipAction.bind(null, e.id)} />
                <ActionButton action={cancelEnrollmentAction.bind(null, e.id)} label="ยกเลิกการสมัคร" variant="ghost" confirm={`ยกเลิกการสมัคร ${e.courseTitle}?`} />
              </div>
            </>
          )}
          {e.status === 'review' && <p className="text-sm text-muted">เจ้าหน้าที่กำลังตรวจยอด ที่นั่งจะยืนยันหลังตรวจเสร็จ (ปกติไม่เกิน 15 นาทีในเวลาทำการ)</p>}
        </Card>
      </div>
    </>
  );
}
