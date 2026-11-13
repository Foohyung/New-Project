import { formatBaht, formatThaiDate } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { AddCouponButton, EditCouponButton } from '@/web/components/reminders/reminders/reminders.marketing';
import { MarketingTabs } from '@/web/components/reminders/reminders/reminders.marketing-tabs';
import { Badge, Card, PageHeader, Stat, type Tone } from '@/web/components/ui/ui/ui';
import { createCouponAction, setCouponActiveAction, updateCouponAction } from '@/api/actions/coupons/coupons/coupons.actions';
import { COUPON_KIND_LABEL, COUPON_TARGET_LABEL } from '@/api/services/coupons/coupons/coupons.service';
import type { CouponDto } from '@/api/types/coupons/coupons/coupons.types';
import { today } from '@/api/lib/clock/clock/clock';
import { listCoupons } from '@/api/dal/coupons/coupons/coupons.dal';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'คูปอง' };

const STATE: Record<CouponDto['state'], { label: string; tone: Tone }> = {
  active: { label: 'ใช้งาน', tone: 'lime' },
  scheduled: { label: 'รอเริ่ม', tone: 'cyan' },
  exhausted: { label: 'ครบสิทธิ์', tone: 'muted' },
  expired: { label: 'หมดเขต', tone: 'muted' },
  off: { label: 'ปิดอยู่', tone: 'danger' },
};

const usage = (c: CouponDto) => (c.limit ? `${String(c.used)} / ${String(c.limit)}` : `${String(c.used)} ครั้ง`);
const conditions = (c: CouponDto) => [c.description, ...c.conditions].join(' · ');

function Meter({ c }: { c: CouponDto }) {
  const pct = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 100;
  return <span aria-hidden className="block h-1.5 w-20 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String(pct)}%` }} className={`block h-full rounded-full ${c.state === 'active' ? 'bg-cyan' : 'bg-faint'}`} /></span>;
}

function Toggle({ c }: { c: CouponDto }) {
  if (c.state === 'expired' || c.state === 'exhausted') return null;
  return <ActionButton action={setCouponActiveAction.bind(null, c.code, c.state === 'off')} label={c.state === 'off' ? 'เปิดใช้' : 'ปิดใช้'} variant="ghost" confirm={c.state === 'off' ? undefined : `ปิดคูปอง ${c.code}? ลูกค้าจะใช้โค้ดนี้ไม่ได้ทันที`} />;
}

export default async function CouponsPage() {
  const { session, allowed } = await pageGuard('marketing.manage');
  if (!allowed) return accessDenied();
  const [coupons, packages] = await Promise.all([listCoupons(session), listPackages(session)]);
  // โค้ดชวนเพื่อนปิดไว้ก่อน — ไม่แสดงโค้ดเดิมที่ยังอยู่ในฐานข้อมูล
  const promos = coupons.filter(c => c.kind !== 'referral');

  return (
    <>
      <PageHeader kicker={session.branch} title="การตลาด" />
      <MarketingTabs current="coupons" />

      <section aria-label="สรุปคูปอง" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รายได้จากคูปอง" value={formatBaht(promos.reduce((s, c) => s + c.revenueSatang, 0))} hint="รวมทุกโค้ด" />
        <Stat label="ใช้งานอยู่" value={promos.filter(c => c.state === 'active').length} hint={`จาก ${String(promos.length)} โค้ด`} />
        <Stat label="ใช้ไปแล้ว" value={promos.reduce((s, c) => s + c.used, 0)} hint="ครั้ง" />
        <Stat label="ต้องตรวจหลักฐาน" value={promos.filter(c => c.state === 'active' && c.proofRequired).length} hint="โค้ดที่ใช้ได้เฉพาะเคาน์เตอร์" />
      </section>

      <div className="flex min-w-0 flex-col gap-4">
          <Card title="คูปองทั้งหมด" subtitle="เคาน์เตอร์ใส่โค้ดตอนรับชำระ · สมาชิกใช้ในแอปหรือจากลิงก์ในข้อความเตือน">
            <AddCouponButton packages={packages.filter(p => p.active).map(p => ({ id: p.id, name: p.name }))} action={createCouponAction} today={today()} />
            {/* มือถือ: การ์ด */}
            <ul className="flex flex-col gap-3 md:hidden">
              {promos.map(c => (
                <li key={c.code} className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
                  <div className="flex items-center justify-between gap-2"><b className="rounded-lg border border-dashed border-line px-2 font-mono text-lime">{c.code}</b><Badge tone={c.kind === 'winback' ? 'violet' : STATE[c.state].tone}>{c.kind === 'winback' ? COUPON_KIND_LABEL.winback : STATE[c.state].label}</Badge></div>
                  <p className="text-sm">{c.label} <span className="text-muted">· {c.appliesTo.map(target => COUPON_TARGET_LABEL[target]).join(', ')} · {conditions(c)}</span></p>
                  <p className="text-xs text-muted">ใช้ได้: {c.startsOn ? formatThaiDate(c.startsOn) : 'ทันที'} – {c.expiresOn ? formatThaiDate(c.expiresOn) : 'ไม่กำหนดวันสิ้นสุด'}</p>
                  <div className="flex items-center justify-between gap-3 text-sm text-muted"><span className="flex items-center gap-2"><Meter c={c} />{usage(c)}</span><b className="font-display text-ink">{formatBaht(c.revenueSatang)}</b></div>
                  {c.kind === 'promo' && <EditCouponButton coupon={c} packages={packages.filter(p => p.active).map(p => ({ id: p.id, name: p.name }))} action={updateCouponAction.bind(null, c.code)} today={today()} />}
                  <Toggle c={c} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="text-xs text-faint"><tr><th scope="col" className="py-2 pr-3 font-medium">โค้ด</th><th scope="col" className="px-3 py-2 font-medium">ส่วนลด</th><th scope="col" className="px-3 py-2 font-medium">ใช้แล้ว</th><th scope="col" className="px-3 py-2 font-medium">ช่วงใช้ได้</th><th scope="col" className="px-3 py-2 text-right font-medium">รายได้</th><th scope="col" className="px-3 py-2 font-medium">สถานะ</th><th scope="col" className="py-2 pl-3"><span className="sr-only">จัดการ</span></th></tr></thead>
                <tbody className="ff-stagger divide-y divide-line">
                  {promos.map(c => (
                    <tr key={c.code}>
                      <th scope="row" className="py-3 pr-3 text-left font-normal"><b className="rounded-lg border border-dashed border-line px-2 font-mono text-lime">{c.code}</b>                      <small className="mt-1 block text-xs text-muted">ใช้กับ {c.appliesTo.map(target => COUPON_TARGET_LABEL[target]).join(', ')} · {conditions(c)}{c.kind === 'winback' && c.ownerName ? ` · ${c.ownerName}` : ''}</small>{c.terms && <small className="mt-0.5 block max-w-md text-xs whitespace-pre-line text-faint">{c.terms}</small>}</th>
                      <td className="px-3 py-3">{c.label}</td>
                      <td className="px-3 py-3"><Meter c={c} /><small className="text-xs text-muted">{usage(c)}</small></td>
                      <td className="px-3 py-3 text-muted">{c.startsOn ? formatThaiDate(c.startsOn) : 'ทันที'}<small className="block text-xs text-faint">ถึง {c.expiresOn ? formatThaiDate(c.expiresOn) : 'ไม่กำหนด'}</small></td>
                      <td className="px-3 py-3 text-right font-display tabular-nums">{formatBaht(c.revenueSatang)}</td>
                      <td className="px-3 py-3"><Badge tone={c.kind === 'winback' ? 'violet' : STATE[c.state].tone}>{c.kind === 'winback' ? COUPON_KIND_LABEL.winback : STATE[c.state].label}</Badge></td>
                      <td className="py-3 pl-3"><div className="flex items-center gap-1">{c.kind === 'promo' && <EditCouponButton coupon={c} packages={packages.filter(p => p.active).map(p => ({ id: p.id, name: p.name }))} action={updateCouponAction.bind(null, c.code)} today={today()} />}<Toggle c={c} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
      </div>
    </>
  );
}
