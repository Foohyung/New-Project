import { formatThaiDateOf, formatThaiTime } from '@repo/utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { PaymentStatusBadge, PromptPayCard } from '@/components/payments';
import { Card, Forbidden, PageHeader } from '@/components/ui';
import { submitSlipAction } from '@/features/payments/actions';
import { promptPayPayload } from '@/features/payments/service';
import { getPayment, shopPromptPayId } from '@/server/dal/payments';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'ชำระเงิน' };

export default async function MyPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return <Forbidden message="หน้านี้สำหรับสมาชิก" />;
  // DAL คืนเฉพาะรายการของสมาชิกคนนี้ — รหัสของคนอื่นจะได้ 404 (กัน IDOR)
  const p = await getPayment(session, (await params).id);
  if (!p) notFound();

  return (
    <>
      <PageHeader back={{ href: '/me', label: 'บัตรสมาชิก' }} kicker={p.receiptNo} title={p.status === 'paid' ? 'ชำระเรียบร้อย' : 'ชำระด้วย PromptPay'} />
      <div className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {p.status === 'paid' ? (
          <Card title={p.packageName}><p className="text-muted">ชำระเมื่อ {formatThaiDateOf(p.paidAt ?? p.createdAt, 'long')} {formatThaiTime(p.paidAt ?? p.createdAt)} น. ขอบคุณที่ใช้บริการ</p></Card>
        ) : (
          <PromptPayCard payload={promptPayPayload(shopPromptPayId(), p.amountSatang)} amountSatang={p.amountSatang} note={`${p.packageName} · ${p.receiptNo}`} />
        )}
        <Card title="สถานะ" action={<PaymentStatusBadge status={p.status} />}>
          {p.status === 'pending' && (
            <>
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>บันทึกภาพ QR หรือสแกนด้วยแอปธนาคาร</li>
                <li>ตรวจยอดเงินให้ตรงก่อนกดโอน</li>
                <li>กด &quot;ฉันโอนแล้ว&quot; ด้านล่าง</li>
              </ol>
              <ActionButton action={submitSlipAction.bind(null, p.id)} label="ฉันโอนแล้ว" variant="primary" />
            </>
          )}
          {p.status === 'review' && <p className="text-sm text-muted">เจ้าหน้าที่กำลังตรวจยอด สิทธิ์จะต่อให้อัตโนมัติหลังตรวจเสร็จ (ปกติไม่เกิน 15 นาทีในเวลาทำการ)</p>}
          {p.status === 'paid' && <p className="text-sm text-muted">ระบบต่ออายุให้เรียบร้อยแล้ว ดูวันหมดอายุใหม่ได้ที่หน้าบัตรสมาชิก</p>}
        </Card>
      </div>
    </>
  );
}
