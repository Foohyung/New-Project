import { formatThaiDateOf } from '@repo/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { BookForMemberForm } from '@/components/booking-forms';
import { classTime } from '@/components/dashboard';
import { Avatar, Badge, Card, Forbidden, InfoList, PageHeader, StatusBadge } from '@/components/ui';
import { bookForMemberAction, cancelBookingAction } from '@/features/classes/actions';
import { CANCEL_CUTOFF_MINUTES } from '@/features/classes/service';
import { getClassDetail } from '@/server/dal/classes';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'รายละเอียดคลาส' };

const STATE_LABEL = { upcoming: ['cyan', 'ยังไม่เริ่ม'], live: ['lime', 'กำลังเรียน'], ended: ['muted', 'จบแล้ว'] } as const;

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, allowed } = await pageGuard('classes.view');
  if (!allowed) return <Forbidden />;
  const c = await getClassDetail(session, (await params).id);
  if (!c) notFound();
  const full = c.booked >= c.capacity;
  const canBook = can(session, 'classes.book');
  const notBookable = c.state !== 'upcoming' ? 'คลาสนี้เริ่มแล้วหรือจบแล้ว' : full ? 'คลาสเต็มแล้ว' : undefined;

  return (
    <>
      <PageHeader back={{ href: '/classes', label: 'ตารางคลาส' }} kicker={`${formatThaiDateOf(c.startsAt, 'long')} · ${classTime(c)} น.`} title={c.title} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={STATE_LABEL[c.state][0]}>{STATE_LABEL[c.state][1]}</Badge>
              <Badge tone={c.level === 'หนัก' ? 'danger' : c.level === 'กลาง' ? 'warn' : 'lime'}>ระดับ{c.level}</Badge>
              {full && <Badge tone="danger">เต็ม</Badge>}
            </div>
            <InfoList items={[
              ['เทรนเนอร์', <Link key="t" href={`/trainers/${c.trainerId}`} className="tap inline-block hover:underline">{c.trainerName}</Link>],
              ['ห้อง', c.room],
              ['ความยาว', `${String(c.minutes)} นาที`],
              ['ที่นั่ง', `จองแล้ว ${String(c.booked)} / ${String(c.capacity)} · ว่าง ${String(Math.max(0, c.capacity - c.booked))}`],
            ]} />
            <div aria-hidden className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String(Math.min(100, (c.booked / c.capacity) * 100))}%` }} className={`block h-full rounded-full ${full ? 'bg-danger' : 'bg-cyan'}`} /></div>
          </Card>
          {canBook && (
            <Card title="จองให้สมาชิก" subtitle={`สมาชิกยกเลิกเองได้ก่อนเริ่ม ${String(CANCEL_CUTOFF_MINUTES / 60)} ชม. · เคาน์เตอร์ยกเลิกให้ได้จนคลาสเริ่ม`}>
              <BookForMemberForm action={bookForMemberAction.bind(null, c.id)} disabled={Boolean(notBookable)} disabledReason={notBookable} />
            </Card>
          )}
        </div>

        <Card title="รายชื่อผู้จอง" subtitle={`สมาชิกในระบบ ${String(c.roster.length)} คน · สมาชิกอื่นอีก ${String(c.otherBooked)} คน`}>
          {c.roster.length === 0 ? <p className="text-sm text-muted">ยังไม่มีสมาชิกในชุดข้อมูลตัวอย่างจองคลาสนี้</p> : (
            <ul className="divide-y divide-line">
              {c.roster.map(r => (
                <li key={r.bookingId} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Avatar name={r.name} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/members/${r.memberId}`} className="tap block truncate font-medium hover:underline">{r.name}</Link>
                    <small className="text-xs text-muted">{r.code}</small>
                  </div>
                  <StatusBadge status={r.status} />
                  {canBook && c.state === 'upcoming' && <ActionButton action={cancelBookingAction.bind(null, r.bookingId)} label="ยกเลิก" variant="ghost" confirm={`ยกเลิกการจองของ ${r.name}?`} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
