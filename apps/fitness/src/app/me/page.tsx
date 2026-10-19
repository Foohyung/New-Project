import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import { CalendarPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { PaymentStatusBadge } from '@/components/payments';
import { QrCode } from '@/components/qr-code';
import { Badge, btn, Card, EmptyState, Forbidden, StatusBadge } from '@/components/ui';
import { cancelBookingAction } from '@/features/classes/actions';
import { CANCEL_CUTOFF_MINUTES } from '@/features/classes/service';
import { buyPackageAction } from '@/features/payments/actions';
import { getPortal } from '@/server/dal/portal';
import { listPackages } from '@/server/dal/packages';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'บัตรสมาชิก' };

export default async function MyCardPage() {
  const { session, allowed } = await pageGuard('portal.use');
  if (!allowed) return <Forbidden message="หน้านี้สำหรับสมาชิก — สลับเป็นบทบาทสมาชิกเพื่อดูตัวอย่าง" />;
  const [me, packages] = await Promise.all([getPortal(session), listPackages(session, { activeOnly: true })]);
  if (!me) return <EmptyState>ไม่พบข้อมูลสมาชิกของบัญชีนี้ ติดต่อเคาน์เตอร์</EmptyState>;
  const pending = me.payments.find(p => p.status !== 'paid');
  const m = me.member;

  return (
    <>
      <header>
        <p className="text-sm text-muted">สวัสดี</p>
        <h1 className="font-display text-2xl font-semibold lg:text-[28px]">คุณ{m.name.split(' ')[0]}</h1>
      </header>

      {pending && (
        <Link href={`/me/pay/${pending.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-warn">
          <span>{pending.status === 'review' ? 'กำลังตรวจสลิป' : 'มีรายการรอชำระ'} · {pending.packageName} {formatBaht(pending.amountSatang)}</span>
          <b className="font-semibold underline underline-offset-2">{pending.status === 'review' ? 'ดูสถานะ' : 'ชำระด้วย PromptPay'}</b>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5">
        {/* บัตรสมาชิก: แสดงที่เคาน์เตอร์ให้สแกน */}
        <section aria-label="บัตรสมาชิก" className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-lime to-[#9fd62a] p-5 text-bg sm:p-6">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="font-display text-lg font-bold tracking-[.08em]">FITFLOW</span>
            <span className="rounded-full bg-bg/15 px-3 py-0.5 text-sm font-semibold">{m.code}</span>
          </div>
          <QrCode value={me.qrValue} label={`QR บัตรสมาชิก ${m.code} สำหรับเช็กอิน`} className="size-56 p-1 sm:size-64" />
          <div className="w-full text-center">
            <p className="font-display text-xl font-semibold">{m.name}</p>
            <p className="text-sm text-bg/75">{m.packageName} · {m.daysLeft >= 0 ? `ใช้ได้ถึง ${formatThaiDate(m.expiresOn)}` : `หมดอายุ ${formatThaiDate(m.expiresOn)}`}</p>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={m.status} />
              {m.ptSessionsLeft > 0 && <Badge tone="violet">PT เหลือ {m.ptSessionsLeft} ครั้ง</Badge>}
              {me.member.freezeUntil && <Badge tone="violet">พักถึง {formatThaiDate(me.member.freezeUntil)}</Badge>}
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{m.daysLeft >= 0 ? `เหลือ ${String(m.daysLeft)} วัน` : 'หมดอายุแล้ว'}</p>
            <p className="text-sm text-muted">แสดง QR ที่เคาน์เตอร์ทุกครั้งที่เข้ายิม</p>
            <Link href="/me/classes" className={`${btn.primary} mt-4 w-full`}><CalendarPlus aria-hidden className="size-5" />จองคลาส</Link>
          </Card>

          <Card title="คลาสที่จองไว้" subtitle={`ยกเลิกได้ก่อนเริ่ม ${String(CANCEL_CUTOFF_MINUTES / 60)} ชั่วโมง`}>
            {me.bookings.length === 0 ? <p className="text-sm text-muted">ยังไม่มีการจอง</p> : (
              <ul className="divide-y divide-line">
                {me.bookings.map(b => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div><b className="font-medium">{b.title}</b><p className="text-xs text-muted">{formatThaiDateOf(b.startsAt)} · {formatThaiTime(b.startsAt)} น. · {b.trainerName} · {b.room}</p></div>
                    <ActionButton action={cancelBookingAction.bind(null, b.id)} label="ยกเลิก" variant="ghost" confirm={`ยกเลิกการจอง ${b.title}?`} />
                  </li>
                ))}
              </ul>
            )}
            {me.ptSessions.length > 0 && (
              <p className="mt-3 border-t border-line pt-3 text-sm">นัด PT ถัดไป {formatThaiDateOf(me.ptSessions[0]?.startsAt ?? '')} {formatThaiTime(me.ptSessions[0]?.startsAt ?? '')} น. กับ{me.ptSessions[0]?.trainerName}</p>
            )}
          </Card>
        </div>
      </div>

      <Card title="ต่ออายุ / ซื้อแพ็กเกจ" subtitle="ชำระด้วย PromptPay · ยังไม่หมดอายุจะต่อจากวันหมดอายุเดิม">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map(p => (
            <li key={p.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-bg p-4">
              <div className="flex items-baseline justify-between gap-3"><b className="font-semibold">{p.name}</b><b className="font-display text-lg text-lime">{formatBaht(p.priceSatang)}</b></div>
              <p className="flex-1 text-sm text-muted">{p.durationLabel} · {p.description}</p>
              <ActionButton action={buyPackageAction.bind(null, p.id)} label={p.kind === 'pt' ? 'ซื้อแพ็กเกจ PT' : 'ต่ออายุด้วยแพ็กเกจนี้'} pendingLabel="กำลังสร้าง QR…" />
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card title="ประวัติเข้ายิม">
          <ul className="divide-y divide-line">
            {me.checkIns.map(c => (
              <li key={c.at} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{formatThaiDateOf(c.at)} · {formatThaiTime(c.at)} น.</span>
                <Badge tone={c.allowed ? 'lime' : 'danger'}>{c.allowed ? 'เข้ายิม' : 'ไม่ผ่าน'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="การชำระเงิน">
          {me.payments.length === 0 ? <p className="text-sm text-muted">ยังไม่มีรายการ</p> : (
            <ul className="divide-y divide-line">
              {me.payments.map(p => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div><Link href={`/me/pay/${p.id}`} className="tap inline-block font-medium hover:underline">{p.packageName}</Link><p className="text-xs text-muted">{p.receiptNo} · {formatThaiDateOf(p.createdAt)}</p></div>
                  <div className="flex items-center gap-3"><b className="font-display">{formatBaht(p.amountSatang)}</b><PaymentStatusBadge status={p.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
