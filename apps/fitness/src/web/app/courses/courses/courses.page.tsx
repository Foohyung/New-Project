import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { confirmEnrollmentAction, createCourseAction, deleteCourseAction, updateCourseAction } from '@/api/actions/courses/courses/courses.actions';
import { courseTrainerOptions, listCourses, listEnrollmentsToReview } from '@/api/dal/courses/courses/courses.dal';
import { can } from '@/api/lib/auth/auth/auth.rbac';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { today } from '@/api/lib/clock/clock/clock';
import { formatBaht, formatThaiDate } from '@/api/lib/utils/utils/utils';
import { AddCourseButton, CourseRowActions } from '@/web/components/courses/courses/courses.forms';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'คอร์สเรียน' };

/** คอร์สเรียน: เพิ่ม แก้ไข ลบ (courses.manage) · ยืนยันการชำระของผู้สมัคร (payments.confirm) */
export default async function CoursesPage() {
  const { session, allowed } = await pageGuard('courses.manage');
  const canConfirm = can(session, 'payments.confirm');
  if (!allowed && !canConfirm) return accessDenied("บทบาทของคุณดูคอร์สเรียนไม่ได้");
  const date = today();
  const [courses, toReview, trainers] = await Promise.all([listCourses(session), listEnrollmentsToReview(session), allowed ? courseTrainerOptions(session) : []]);

  return (
    <>
      <PageHeader kicker="สมาชิกสมัครเองในพอร์ทัล แล้วโอนผ่าน PromptPay" title="คอร์สเรียน" />
      {toReview.length > 0 && (
        <Card title="รอตรวจสลิป" subtitle={`${String(toReview.length)} รายการ · ตรวจยอดในบัญชีแล้วกดยืนยัน`}>
          <ul className="divide-y divide-line">
            {toReview.map(e => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <b className="block">{e.memberName} <span className="font-normal text-muted">· {e.memberCode}</span></b>
                  <span className="text-muted">{e.courseTitle} · {e.receiptNo} · <b className="text-ink">{formatBaht(e.amountSatang)}</b></span>
                </div>
                {canConfirm && <ActionButton action={confirmEnrollmentAction.bind(null, e.id)} label="ยืนยันเงินเข้า" variant="primary" confirm={`ยืนยันว่าได้รับ ${formatBaht(e.amountSatang)} จาก ${e.memberName} สำหรับ ${e.courseTitle}?`} successTitle="ยืนยันการชำระแล้ว" />}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card
        title="คอร์สทั้งหมด"
        subtitle={`${String(courses.length)} คอร์ส · คอร์สที่เคยมีผู้สมัครลบไม่ได้ ให้ปิดรับสมัครแทน`}
        action={allowed ? <AddCourseButton action={createCourseAction} trainers={trainers} today={date} /> : undefined}
      >
        {courses.length === 0 ? <EmptyState>ยังไม่มีคอร์ส {allowed && 'กดปุ่ม + มุมขวาล่างเพื่อเพิ่ม'}</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-3 py-2">คอร์ส</th><th className="px-3 py-2">ช่วงเรียน</th><th className="px-3 py-2 text-right">ราคา</th><th className="px-3 py-2">ผู้สมัคร</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {courses.map(c => {
                  const ended = c.endsOn < date;
                  return (
                    <tr key={c.id}>
                      <td className="px-3 py-3"><b className="block">{c.title}</b><span className="text-xs text-muted">{c.schedule}{c.trainerName && ` · ${c.trainerName}`}{c.room && ` · ${c.room}`}</span></td>
                      <td className="px-3 py-3">{formatThaiDate(c.startsOn)} – {formatThaiDate(c.endsOn)}<span className="block text-xs text-muted">{c.sessions} ครั้ง</span></td>
                      <td className="px-3 py-3 text-right font-display text-base font-bold">{formatBaht(c.priceSatang)}</td>
                      <td className="px-3 py-3">{c.taken}/{c.capacity} ที่<span className="block text-xs text-muted">ชำระแล้ว {c.paid}{c.review > 0 && ` · รอตรวจ ${String(c.review)}`}</span></td>
                      <td className="w-px whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-2">
                          {ended ? <Badge tone="muted">จบแล้ว</Badge> : c.active ? (c.taken >= c.capacity ? <Badge tone="danger">เต็ม</Badge> : <Badge tone="lime">เปิดรับสมัคร</Badge>) : <Badge tone="muted">ปิดรับสมัคร</Badge>}
                          <div className="flex items-center gap-1">
                            <Link href={`/courses/${c.id}`} aria-label={`ดูผู้สมัคร ${c.title}`} title="ดูผู้สมัคร" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-lime/10 hover:text-lime"><Eye aria-hidden className="size-5" /></Link>
                            <CourseRowActions course={c} trainers={trainers} today={date} updateAction={allowed ? updateCourseAction : undefined} deleteAction={allowed && !c.hasEnrollments ? deleteCourseAction.bind(null, c.id) : undefined} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
