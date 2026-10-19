import { formatBaht, formatThaiDate } from '@repo/utils';
import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { Badge, Card, EmptyState, Forbidden, PageHeader, Stat } from '@/components/ui';
import { runBillingAction, sendPayLinkAction } from '@/features/subscriptions/actions';
import { getSubscriptionOverview } from '@/server/dal/subscriptions';
import { pageGuard } from '@/server/guard';
import { can } from '@/server/rbac';

export const metadata: Metadata = { title: 'ตัดบัตรอัตโนมัติ' };

const short = (satang: number) => (satang >= 100_000_00 ? `฿${(satang / 100_000).toFixed(0)}K` : formatBaht(satang));

export default async function SubscriptionsPage() {
  const { session, allowed } = await pageGuard('payments.view');
  if (!allowed) return <Forbidden />;
  const o = await getSubscriptionOverview(session);
  const max = Math.max(...o.mrrTrend.map(t => t.satang), 1);
  const canRun = can(session, 'payments.confirm');

  return (
    <>
      <PageHeader back={{ href: '/payments', label: 'การเงิน' }} kicker={session.branch} title="ตัดบัตรอัตโนมัติ" actions={canRun ? <ActionButton action={runBillingAction} label="ตัดบัตรรอบวันนี้" pendingLabel="กำลังตัดบัตร…" variant="primary" /> : undefined} />

      <section aria-label="ภาพรวม" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รายได้ประจำต่อเดือน (MRR)" value={short(o.mrrSatang)} hint="จากสมาชิกที่ตัดบัตร" />
        <Stat label="สมาชิกตัดบัตร" value={o.subscribers} hint={`${String(o.sharePct)}% ของสมาชิกรายเดือน/ปี`} />
        <Stat label="จะตัดใน 7 วัน" value={o.upcoming.length} hint={formatBaht(o.upcoming.reduce((s, u) => s + u.amountSatang, 0))} />
        <Stat label="ตัดไม่ผ่าน" value={<span className={o.problems.length ? 'text-danger' : ''}>{o.problems.length}</span>} hint={`${String(o.failing)} รอลองใหม่`} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-5">
        <Card title="ตัดไม่ผ่าน" subtitle="ระบบลองใหม่หลังวันครบกำหนด 1, 3 และ 5 วัน แล้วแจ้งสมาชิกให้เปลี่ยนบัตร">
          {o.problems.length === 0 ? <EmptyState>ไม่มีรายการตัดไม่ผ่าน</EmptyState> : (
            <ul className="divide-y divide-line">
              {o.problems.map(p => (
                <li key={p.chargeId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/members/${p.memberId}`} className="tap inline-block font-semibold hover:underline">{p.name}</Link>
                      <b className="font-display">{formatBaht(p.amountSatang)}</b>
                      <Badge tone={p.status === 'failed' ? 'danger' : 'warn'}>{p.status === 'failed' ? 'หยุดลองแล้ว' : 'รอลองใหม่'}</Badge>
                    </div>
                    <p className="text-sm text-muted">{p.reason}</p>
                    <ol aria-label="ประวัติการตัดบัตร" className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      {p.attempts.map((a, i) => (
                        <li key={a.on + String(i)} className={`rounded-full px-2 py-0.5 font-semibold ${a.ok ? 'bg-lime/15 text-lime' : 'bg-danger/15 text-danger'}`}>{formatThaiDate(a.on)} {a.ok ? 'ผ่าน' : 'ไม่ผ่าน'}</li>
                      ))}
                      {p.nextRetryOn && <li className="rounded-full border border-warn px-2 py-0.5 font-semibold text-warn">ลองใหม่ {formatThaiDate(p.nextRetryOn)}</li>}
                    </ol>
                  </div>
                  <ActionButton action={sendPayLinkAction.bind(null, p.chargeId)} label="ส่งลิงก์จ่าย PromptPay" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="MRR 6 เดือน" subtitle="แนวโน้ม (ข้อมูลตัวอย่าง)">
          <div className="flex h-40 items-end gap-2" role="img" aria-label={`MRR เดือนล่าสุด ${formatBaht(o.mrrSatang)}`}>
            {o.mrrTrend.map((t, i) => (
              <div key={t.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 text-xs text-faint">
                <span style={{ height: `${String((t.satang / max) * 100)}%` }} className={`block w-full rounded-t-md ${i === o.mrrTrend.length - 1 ? 'bg-lime' : 'bg-lime/30'}`} />
                {t.month}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Card title="จะตัดบัตรใน 7 วัน" subtitle="สมาชิกได้รับแจ้งเตือนล่วงหน้าแล้ว">
          {o.upcoming.length === 0 ? <p className="text-sm text-muted">ไม่มีรายการ</p> : (
            <ul className="divide-y divide-line">
              {o.upcoming.map(u => (
                <li key={u.memberId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><Link href={`/members/${u.memberId}`} className="tap block truncate font-medium hover:underline">{u.name}</Link><span className="text-xs text-muted">{u.packageName} · {u.card}</span></div>
                  <div className="text-right"><b className="font-display">{formatBaht(u.amountSatang)}</b><span className="block text-xs text-muted">{formatThaiDate(u.dueOn)}</span></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="ตัดผ่านล่าสุด">
          {o.recent.length === 0 ? <p className="text-sm text-muted">ยังไม่มีรายการในรอบนี้ กด &quot;ตัดบัตรรอบวันนี้&quot; เพื่อทดลอง</p> : (
            <ul className="divide-y divide-line">
              {o.recent.map(r => (
                <li key={`${r.memberId}-${r.on}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>{r.name}<span className="block text-xs text-muted">{formatThaiDate(r.on)}</span></span>
                  {r.paymentId ? <Link href={`/payments/${r.paymentId}`} className="tap inline-block font-semibold text-lime">{formatBaht(r.amountSatang)} · ใบเสร็จ</Link> : <b>{formatBaht(r.amountSatang)}</b>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-dashed border-warn/45 bg-warn/5 p-3 text-sm text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
        <span><b className="text-warn">ระยะที่ 1</b> จำลองการตัดบัตร (ไม่เก็บเลขบัตรจริง) · ระยะที่ 2 ต่อ Payment Gateway ที่รองรับ recurring เช่น Omise / 2C2P โดยเก็บแค่ token ของบัตร (PCI DSS)</span>
      </p>
    </>
  );
}
