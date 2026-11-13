import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEnrollmentReceipt } from '@/api/dal/courses/courses/courses.dal';
import { paymentSetupForBranch } from '@/api/dal/payments/payments/payments.dal';
import { shopProfile } from '@/api/dal/payments/payments/payments.shop';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { AutoPrint } from '@/web/components/payments/payments/auto-print';
import { PrintButton } from '@/web/components/ui/ui/ui.print-button';
import { SimpleReceiptDocument } from '@/web/components/payments/payments/payments.receipt';
import { PageHeader } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'ใบเสร็จคอร์ส' };

export default async function CourseReceiptPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const data = await getEnrollmentReceipt(session, (await params).id);
  if (!data || data.enrollment.status !== 'paid') notFound();
  const { enrollment: e, branch } = data;
  const setup = await paymentSetupForBranch(branch);
  const shouldPrint = (await searchParams).print === '1';

  return (
    <>
      <AutoPrint enabled={shouldPrint} />
      <div className="print:hidden">
        <PageHeader
          back={{ href: session.role === 'member' ? `/me/courses/${e.id}` : `/courses/${e.courseId}`, label: 'กลับ' }}
          kicker={e.receiptNo}
          title="ใบเสร็จรับเงิน"
          actions={<PrintButton />}
        />
      </div>
      <SimpleReceiptDocument
        receiptNo={e.receiptNo}
        issuedAt={e.paidAt ?? e.createdAt}
        method={e.method}
        customer={e.memberName}
        customerCode={e.memberCode}
        receivedBy={e.receivedBy}
        lines={[
          { description: e.courseTitle, quantity: 1, unitSatang: e.listPriceSatang },
          ...(e.discountSatang > 0 ? [{ description: `ส่วนลดคูปอง ${e.couponCode ?? ''}`.trim(), quantity: 1, unitSatang: -e.discountSatang }] : []),
        ]}
        amountSatang={e.amountSatang}
        shop={await shopProfile(branch, setup)}
      />
    </>
  );
}
