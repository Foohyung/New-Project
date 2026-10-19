import { formatBaht, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { PaymentStatusBadge, PromptPayCard } from '@/components/payments';
import { PrintButton } from '@/components/print-button';
import { Card, Forbidden, PageHeader } from '@/components/ui';
import { confirmPaymentAction, submitSlipAction } from '@/features/payments/actions';
import { METHOD_LABEL, promptPayPayload } from '@/features/payments/service';
import { KIND_LABEL } from '@/features/payments/types';
import { getPayment, shopPromptPayId } from '@/server/dal/payments';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

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
        <PageHeader back={{ href: '/payments', label: 'การเงิน' }} kicker={p.receiptNo} title={paid ? 'ใบเสร็จรับเงิน' : 'รอชำระเงิน'} actions={paid ? <PrintButton /> : undefined} />
      </div>
      {created && !paid && <p role="status" className="rounded-2xl border border-lime/40 bg-lime/10 p-4 font-semibold text-lime print:hidden">สมัครสมาชิกแล้ว ให้สมาชิกสแกน QR ด้านล่างเพื่อชำระ สิทธิ์เริ่มทันทีที่ยืนยันเงินเข้า</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-5">
        {/* ใบเสร็จ: พิมพ์เป็น A4 ได้ (§15.2.8) */}
        <section aria-label="ใบเสร็จ" className="receipt rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="font-display text-2xl font-bold tracking-[.06em]">FITFLOW</p>
              <p className="text-sm text-muted">{session.branch} · 123 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ</p>
              <p className="text-sm text-muted">เลขประจำตัวผู้เสียภาษี 0-1055-XXXXX-XX-X (ตัวอย่าง)</p>
            </div>
            <div className="text-right">
              <PaymentStatusBadge status={p.status} />
              <p className="mt-1 font-display text-lg font-semibold">{p.receiptNo}</p>
              <p className="text-sm text-muted">{formatThaiDateOf(p.paidAt ?? p.createdAt, 'long')} {formatThaiTime(p.paidAt ?? p.createdAt)} น.</p>
            </div>
          </header>
          <dl className="grid gap-3 border-b border-line py-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-faint">สมาชิก</dt><dd><Link href={`/members/${p.memberId}`} className="tap inline-block font-medium hover:underline print:no-underline">{p.memberName}</Link> · {p.memberCode}</dd></div>
            <div><dt className="text-xs text-faint">ชำระด้วย</dt><dd>{METHOD_LABEL[p.method]}</dd></div>
          </dl>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="text-xs text-faint"><tr><th scope="col" className="py-3 font-medium">รายการ</th><th scope="col" className="py-3 text-right font-medium">จำนวนเงิน</th></tr></thead>
            <tbody>
              <tr className="border-t border-line"><td className="py-3">{KIND_LABEL[p.kind]} · {p.packageName}</td><td className="py-3 text-right">{formatBaht(p.amountSatang, { showSatang: true })}</td></tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-line"><th scope="row" className="py-3 text-left font-semibold">รวมทั้งสิ้น (รวม VAT)</th><td className="py-3 text-right font-display text-xl font-semibold">{formatBaht(p.amountSatang, { showSatang: true })}</td></tr>
            </tfoot>
          </table>
          <p className="mt-4 text-xs text-faint">เอกสารนี้ออกโดยระบบ FitFlow (โหมดทดลอง — ไม่ใช่ใบกำกับภาษีจริง)</p>
        </section>

        {!paid && (
          <div className="flex flex-col gap-4 print:hidden">
            <PromptPayCard payload={promptPayPayload(shopPromptPayId(), p.amountSatang)} amountSatang={p.amountSatang} note={`${p.receiptNo} · ${p.memberName}`} />
            <Card title="ขั้นตอนถัดไป">
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>สมาชิกสแกน QR ด้วยแอปธนาคาร</li>
                <li>ตรวจยอดเข้าบัญชีร้าน (ระยะที่ 2 ตรวจสลิปอัตโนมัติ)</li>
                <li>กดยืนยัน ระบบต่ออายุให้ทันที</li>
              </ol>
              <div className="flex flex-col gap-2">
                {p.status === 'pending' && <ActionButton action={submitSlipAction.bind(null, p.id)} label="สมาชิกแจ้งโอนแล้ว" />}
                {can(session, 'payments.confirm') && <ActionButton action={confirmPaymentAction.bind(null, p.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับเงิน ${formatBaht(p.amountSatang)} แล้ว?`} />}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
