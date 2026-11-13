import type { Metadata } from 'next';
import Link from 'next/link';
import { listOpenCourses } from '@/api/dal/courses/courses/courses.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatBaht, formatThaiDate } from '@/api/lib/utils/utils/utils';
import { EnrollmentStatusBadge } from '@/web/components/courses/courses/courses.badges';
import { CourseEnrollButton } from '@/web/components/courses/courses/courses.enroll-button';
import { Badge, EmptyState, PageHeader, btn } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { ReceiptPrintLink } from '@/web/components/payments/payments/receipt-print-link';

export const metadata: Metadata = { title: 'คอร์สเรียน' };

/** สมาชิกดูคอร์สที่เปิดรับสมัครแล้วสมัครเอง → ชำระด้วย PromptPay */
export default async function MyCoursesPage() {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return accessDenied("หน้านี้สำหรับสมาชิก — สลับเป็นบทบาทสมาชิกเพื่อดูตัวอย่าง");
  const courses = await listOpenCourses(session);

  return (
    <>
      <PageHeader back={{ href: '/me', label: 'บัตรสมาชิก' }} title="คอร์สเรียน" kicker="สมัครแล้วชำระด้วย PromptPay ที่นั่งยืนยันเมื่อเจ้าหน้าที่ตรวจยอดแล้ว" />
      {courses.length === 0 ? <EmptyState>ตอนนี้ยังไม่มีคอร์สเปิดรับสมัคร</EmptyState> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.map(c => {
            const full = c.taken >= c.capacity;
            return (
              <li key={c.id} className={`flex flex-col gap-2 rounded-2xl border bg-surface p-4 ${c.mine ? 'border-lime/50' : 'border-line'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted">{formatThaiDate(c.startsOn)} – {formatThaiDate(c.endsOn)}</span>
                  {c.mine ? <EnrollmentStatusBadge status={c.mine.status} /> : full ? <Badge tone="danger">เต็ม</Badge> : <Badge>ว่าง {c.capacity - c.taken} ที่</Badge>}
                </div>
                <b className="font-display text-lg font-semibold">{c.title}</b>
                <p className="text-sm text-muted">{c.schedule} · {c.sessions} ครั้ง{c.trainerName && ` · ${c.trainerName}`}{c.room && ` · ${c.room}`}</p>
                {c.description && <p className="line-clamp-3 text-sm whitespace-pre-line text-muted">{c.description}</p>}
                <p className="mt-auto font-display text-2xl font-semibold">{formatBaht(c.priceSatang)}</p>
                {c.mine
                  ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={`/me/courses/${c.mine.id}`} className={btn.secondary}>{c.mine.status === 'pending' ? 'ไปชำระเงิน' : 'ดูรายละเอียด'}</Link>
                      {c.mine.status === 'paid' && <ReceiptPrintLink href={`/courses/receipt/${c.mine.id}?print=1`} />}
                    </div>
                  )
                  : !full && <CourseEnrollButton courseId={c.id} title={c.title} priceSatang={c.priceSatang} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
