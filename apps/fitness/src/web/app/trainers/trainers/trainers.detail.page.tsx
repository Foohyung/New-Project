import { formatThaiDateOf, formatThaiTime } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { PtBookForm } from '@/web/components/classes/classes/classes.booking-forms';
import { classTime } from '@/web/components/dashboard/dashboard/dashboard';
import { Avatar, Badge, Card, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { bookPtAction, cancelPtAction, completePtAction } from '@/api/actions/trainers/trainers/trainers.actions';
import { now, today } from '@/api/lib/clock/clock/clock';
import { getTrainerDetail } from '@/api/dal/trainers/trainers/trainers.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'เทรนเนอร์' };

const STATUS = { booked: ['cyan', 'นัดไว้'], done: ['lime', 'เทรนแล้ว'], cancelled: ['muted', 'ยกเลิก'] } as const;

export default async function TrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('trainers.view');
  if (!allowed) return <Forbidden />;
  const t = await getTrainerDetail(session, (await params).id);
  if (!t) notFound();
  const instant = now().toISOString();

  return (
    <>
      <PageHeader back={{ href: '/trainers', label: 'เทรนเนอร์' }} kicker={t.name} title={t.nickname} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={t.name} className="size-14 text-lg" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap gap-1.5">{t.specialties.map(s => <Badge key={s} tone="cyan">{s}</Badge>)}</p>
                <p className="mt-2 text-sm text-muted">{t.bio}</p>
              </div>
            </div>
          </Card>

          <Card title="คิวเทรนเนอร์ส่วนตัว (PT)" subtitle="3 วันย้อนหลัง และ 7 วันข้างหน้า">
            {t.sessions.length === 0 ? <p className="text-sm text-muted">ยังไม่มีคิว</p> : (
              <ul className="divide-y divide-line">
                {t.sessions.map(s => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="w-28 shrink-0 text-sm">
                      <b className="block">{formatThaiDateOf(s.startsAt)}</b>
                      <span className="text-muted tabular-nums">{formatThaiTime(s.startsAt)} น.</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${s.memberId}`} className="tap block truncate font-medium hover:underline">{s.memberName}</Link>
                      <small className="text-xs text-muted">{s.memberCode} · {s.minutes} นาที</small>
                    </div>
                    <Badge tone={STATUS[s.status][0]}>{STATUS[s.status][1]}</Badge>
                    {t.canManage && s.status === 'booked' && (
                      <div className="flex gap-2">
                        {s.startsAt <= instant && <ActionButton action={completePtAction.bind(null, t.id, s.id)} label="เทรนเสร็จ" variant="primary" />}
                        <ActionButton action={cancelPtAction.bind(null, t.id, s.id)} label="ยกเลิก" variant="ghost" confirm={`ยกเลิกคิว PT ของ ${s.memberName}?`} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {t.canManage && (
            <Card title="จองคิว PT" subtitle="ระบบกันเวลาซ้อน และตรวจครั้ง PT ที่สมาชิกเหลือให้อัตโนมัติ">
              <PtBookForm action={bookPtAction.bind(null, t.id)} today={today()} />
            </Card>
          )}
          <Card title="คลาสที่สอน 7 วันนี้" subtitle={`${String(t.classes.length)} คลาส`}>
            <ul className="divide-y divide-line">
              {t.classes.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/classes/${c.id}`} className="tap block truncate font-medium hover:underline">{c.title}</Link>
                    <small className="text-xs text-muted">{formatThaiDateOf(c.startsAt)} · {classTime(c)} · {c.room}</small>
                  </div>
                  <span className="text-sm whitespace-nowrap text-muted">{c.booked}/{c.capacity}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
