import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cancelEnrollmentAction, confirmEnrollmentAction } from '@/api/actions/courses/courses/courses.actions';
import { getCourse } from '@/api/dal/courses/courses/courses.dal';
import { can } from '@/api/lib/auth/auth/auth.rbac';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiMobile } from '@/api/lib/utils/utils/utils';
import { METHOD_LABEL } from '@/api/services/payments/payments/payments.service';
import { EnrollmentStatusBadge } from '@/web/components/courses/courses/courses.badges';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { ReceiptPrintLink } from '@/web/components/payments/payments/receipt-print-link';
import Image from 'next/image';

export const metadata: Metadata = { title: 'ผู้สมัครคอร์ส' };

/** รายละเอียดคอร์สและรายชื่อผู้สมัคร — ยืนยันเงินเข้า / ยกเลิกการสมัคร */
export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('courses.manage');
  const canConfirm = can(session, 'payments.confirm');
  if (!allowed && !canConfirm) return accessDenied("บทบาทของคุณดูคอร์สเรียนไม่ได้");
  const data = await getCourse(session, (await params).id);
  if (!data) notFound();
  const { course: c, enrollments } = data;
  const active = enrollments.filter(e => e.status !== 'cancelled');
  const cancelled = enrollments.length - active.length;

  return (
    <>
      <PageHeader back={{ href: '/courses', label: 'คอร์สเรียน' }} kicker={`${formatThaiDate(c.startsOn)} – ${formatThaiDate(c.endsOn)} · ${c.schedule}`} title={c.title} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="ที่นั่ง"><p className="font-display text-3xl font-semibold">{c.taken}<span className="text-lg text-muted">/{c.capacity}</span></p></Card>
        <Card title="ชำระแล้ว"><p className="font-display text-3xl font-semibold">{c.paid} <span className="text-lg text-muted">คน</span></p></Card>
        <Card title="ยอดชำระแล้ว"><p className="font-display text-3xl font-semibold">{formatBaht(enrollments.filter(e => e.status === 'paid').reduce((s, e) => s + e.amountSatang, 0))}</p></Card>
      </div>
      <Card title="ผู้สมัคร" subtitle={`${String(active.length)} คน${cancelled ? ` · ยกเลิก ${String(cancelled)} คน` : ''} · ราคา ${formatBaht(c.priceSatang)}${c.trainerName ? ` · ผู้สอน ${c.trainerName}` : ''}`}>
        {enrollments.length === 0 ? <EmptyState>ยังไม่มีผู้สมัคร</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-3 py-2">สมาชิก</th><th className="px-3 py-2">ใบเสร็จ</th><th className="px-3 py-2 text-right">ยอด</th><th className="px-3 py-2">สมัครเมื่อ</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {enrollments.map(e => (
                  <tr key={e.id} className={e.status === 'cancelled' ? 'opacity-55' : ''}>
                    <td className="px-3 py-3"><b className="block">{e.memberName}</b><span className="text-xs text-muted">{e.memberCode} · {formatThaiMobile(e.memberPhone)}</span></td>
                    <td className="px-3 py-3">{e.receiptNo}<span className="block text-xs text-muted">{METHOD_LABEL[e.method]}{e.receivedBy && ` · รับโดย ${e.receivedBy}`}</span></td>
                    <td className="px-3 py-3 text-right font-semibold">{formatBaht(e.amountSatang)}{e.couponCode && <span className="block text-xs font-normal text-lime">คูปอง {e.couponCode} · ลด {formatBaht(e.discountSatang)}</span>}</td>
                    <td className="px-3 py-3 text-muted">{formatThaiDateOf(e.createdAt)}{e.paidAt && <span className="block text-xs">ชำระ {formatThaiDateOf(e.paidAt)}</span>}</td>
                    <td className="w-px whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <EnrollmentStatusBadge status={e.status} />
                        {e.status === 'paid' && <ReceiptPrintLink href={`/courses/receipt/${e.id}?print=1`} />}
                        {e.hasSlip && (
                          <a href={`/api/course-enrollments/${encodeURIComponent(e.id)}/slip`} target="_blank" rel="noreferrer" aria-label={`ดูสลิป ${e.receiptNo}`}>
                            <Image src={`/api/course-enrollments/${encodeURIComponent(e.id)}/slip`} alt={`สลิป ${e.receiptNo}`} width={40} height={40} unoptimized className="size-10 rounded-lg border border-line bg-white object-contain" />
                          </a>
                        )}
                        {canConfirm && (e.status === 'review' || e.status === 'pending') && <ActionButton action={confirmEnrollmentAction.bind(null, e.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับ ${formatBaht(e.amountSatang)} จาก ${e.memberName}?`} successTitle="ยืนยันการชำระแล้ว" />}
                        {allowed && e.status !== 'cancelled' && <ActionButton action={cancelEnrollmentAction.bind(null, e.id)} label="ยกเลิก" variant="ghost" confirm={`ยกเลิกการสมัครของ ${e.memberName}? ที่นั่งจะว่างให้คนอื่น${e.status === 'paid' ? ' (ชำระแล้ว — คืนเงินนอกระบบ)' : ''}`} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {c.description && <Card title="รายละเอียดคอร์ส"><p className="text-sm whitespace-pre-line text-muted">{c.description}</p></Card>}
    </>
  );
}
