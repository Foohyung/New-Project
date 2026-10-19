import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiMobile, formatThaiTime } from '@repo/utils';
import { CalendarPlus, Snowflake } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { FreezeForm, MemberEditForm, RenewForm } from '@/components/member-forms';
import { PaymentStatusBadge } from '@/components/payments';
import { QrCode } from '@/components/qr-code';
import { Avatar, Badge, btn, Card, Forbidden, InfoList, PageHeader, StatusBadge } from '@/components/ui';
import { cancelBookingAction } from '@/features/classes/actions';
import { freezeMemberAction, renewMemberAction, unfreezeMemberAction, updateMemberAction } from '@/features/members/actions';
import { memberQrValue } from '@/features/members/service';
import { METHOD_LABEL } from '@/features/payments/service';
import { today } from '@/server/clock';
import { getMemberDetail } from '@/server/dal/members';
import { listPackages } from '@/server/dal/packages';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'ข้อมูลสมาชิก' };

const PT_STATUS = { booked: ['cyan', 'นัดไว้'], done: ['lime', 'เทรนแล้ว'], cancelled: ['muted', 'ยกเลิก'] } as const;

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('members.view');
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  const member = await getMemberDetail(session, id);
  if (!member) notFound();
  const created = (await searchParams).created === '1';
  const manage = can(session, 'members.manage');
  const packages = manage ? await listPackages(session, { activeOnly: true }) : [];
  const date = today();

  return (
    <>
      <PageHeader
        back={{ href: '/members', label: 'สมาชิก' }}
        kicker={`${member.code} · สมัครเมื่อ ${formatThaiDate(member.joinedOn)}`}
        title={member.name}
        actions={can(session, 'classes.book') && member.status !== 'expired' && member.status !== 'frozen' ? <Link href="/classes" className={btn.secondary}><CalendarPlus aria-hidden className="size-5" />จองคลาส</Link> : undefined}
      />

      {created && <p role="status" className="rounded-2xl border border-lime/40 bg-lime/10 p-4 font-semibold text-lime">สมัครสมาชิกเรียบร้อย ยื่นบัตร QR ด้านล่างให้สมาชิกบันทึกไว้ใช้เช็กอิน</p>}
      {member.pendingPaymentId && (
        <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-warn">
          มีรายการรอชำระ/รอตรวจสลิป — สิทธิ์จะเริ่มหลังยืนยันการชำระ{' '}
          {can(session, 'payments.view') && <Link href={`/payments/${member.pendingPaymentId}`} className="tap inline-block font-semibold underline underline-offset-2">เปิดรายการชำระ</Link>}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={member.name} className="size-14 text-lg" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2"><StatusBadge status={member.status} />{member.ptSessionsLeft > 0 && <Badge tone="violet">PT เหลือ {member.ptSessionsLeft} ครั้ง</Badge>}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{member.packageName}</p>
                <p className="text-sm text-muted">
                  {member.daysLeft >= 0 ? `ใช้ได้ถึง ${formatThaiDate(member.expiresOn, 'long')} · เหลือ ${String(member.daysLeft)} วัน` : `หมดอายุเมื่อ ${formatThaiDate(member.expiresOn, 'long')}`}
                </p>
              </div>
            </div>
            {member.freeze && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet/10 p-3 text-violet">
                <p className="flex items-center gap-2 text-sm"><Snowflake aria-hidden className="size-4" />พักสมาชิก {formatThaiDate(member.freeze.from)} – {formatThaiDate(member.freeze.until)}</p>
                {manage && <ActionButton action={unfreezeMemberAction.bind(null, member.id)} label="ยกเลิกการพัก" confirm="ยกเลิกการพักวันนี้? วันที่เหลือจะถูกหักออกจากวันหมดอายุ" />}
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <InfoList items={[
                ['เบอร์มือถือ', <a key="tel" href={`tel:${member.phone}`} className="tap inline-block hover:underline">{formatThaiMobile(member.phone)}</a>],
                ['อีเมล', member.email ?? '—'],
                ['เช็กอินล่าสุด', member.lastCheckInAt ? `${formatThaiDateOf(member.lastCheckInAt)} ${formatThaiTime(member.lastCheckInAt)} น.` : 'ยังไม่เคย'],
                ['หมายเหตุ', member.note ?? '—'],
              ]} />
            </div>
          </Card>

          {manage && (
            <Card title="ต่ออายุ / ซื้อแพ็กเกจเพิ่ม" subtitle="ยังไม่หมดอายุจะต่อจากวันหมดอายุเดิม ไม่เสียวันที่เหลือ">
              <RenewForm packages={packages} action={renewMemberAction.bind(null, member.id)} currentExpiresOn={member.expiresOn} today={date} />
            </Card>
          )}

          <Card title="คลาสที่จองไว้" subtitle={`${String(member.bookings.length)} คลาสที่กำลังจะถึง`}>
            {member.bookings.length === 0 ? <p className="text-sm text-muted">ยังไม่มีการจอง</p> : (
              <ul className="divide-y divide-line">
                {member.bookings.map(b => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div><Link href={`/classes/${b.classId}`} className="tap inline-block font-medium hover:underline">{b.title}</Link><p className="text-xs text-muted">{formatThaiDateOf(b.startsAt)} · {formatThaiTime(b.startsAt)} น. · {b.room}</p></div>
                    {can(session, 'classes.book') && <ActionButton action={cancelBookingAction.bind(null, b.id)} label="ยกเลิกจอง" variant="ghost" confirm={`ยกเลิกการจอง ${b.title}?`} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {member.payments && (
            <Card title="ประวัติการชำระเงิน">
              {member.payments.length === 0 ? <p className="text-sm text-muted">ยังไม่มีรายการ</p> : (
                <ul className="divide-y divide-line">
                  {member.payments.map(p => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/payments/${p.id}`} className="tap inline-block font-medium hover:underline">{p.receiptNo} · {p.packageName}</Link>
                        <p className="text-xs text-muted">{formatThaiDateOf(p.createdAt)} · {METHOD_LABEL[p.method]}</p>
                      </div>
                      <div className="flex items-center gap-3"><b className="font-display">{formatBaht(p.amountSatang)}</b><PaymentStatusBadge status={p.status} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card title="บัตรสมาชิก" subtitle="สแกนที่เคาน์เตอร์เพื่อเช็กอิน">
            <div className="flex items-center gap-4">
              <QrCode value={memberQrValue(member.code)} label={`QR บัตรสมาชิก ${member.code}`} className="size-32 shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold">{member.code}</p>
                <p className="text-sm text-muted">ส่งให้สมาชิกบันทึกภาพหน้าจอ หรือเปิดจากหน้าบัตรสมาชิกในมือถือ</p>
              </div>
            </div>
          </Card>

          {manage && !member.freeze && member.status !== 'expired' && (
            <Card title="พักสมาชิก" subtitle="เช่น บาดเจ็บ เดินทาง — วันหมดอายุเลื่อนออกไปเท่าจำนวนวันที่พัก">
              <FreezeForm action={freezeMemberAction.bind(null, member.id)} expiresOn={member.expiresOn} today={date} />
            </Card>
          )}

          {member.ptSessions.length > 0 && (
            <Card title="เทรนเนอร์ส่วนตัว" subtitle={`เหลือ ${String(member.ptSessionsLeft)} ครั้ง`}>
              <ul className="divide-y divide-line">
                {member.ptSessions.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">{formatThaiDateOf(s.startsAt)} {formatThaiTime(s.startsAt)} น. · {s.trainerName}</span>
                    <Badge tone={PT_STATUS[s.status][0]}>{PT_STATUS[s.status][1]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="ประวัติเช็กอิน" subtitle="10 ครั้งล่าสุด">
            {member.checkIns.length === 0 ? <p className="text-sm text-muted">ยังไม่เคยเช็กอิน</p> : (
              <ul className="divide-y divide-line">
                {member.checkIns.map(c => (
                  <li key={c.at} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{formatThaiDateOf(c.at)} · {formatThaiTime(c.at)} น.</span>
                    <Badge tone={c.allowed ? 'lime' : 'danger'}>{c.allowed ? 'ผ่าน' : 'ปฏิเสธ'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {manage && (
            <Card title="แก้ไขข้อมูลติดต่อ">
              <MemberEditForm member={member} action={updateMemberAction.bind(null, member.id)} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
