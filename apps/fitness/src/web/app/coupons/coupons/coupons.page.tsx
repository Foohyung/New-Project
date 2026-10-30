import { formatBaht, formatThaiDate } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import { ActionButton } from '@/web/components/ui/ui/ui.action-button';
import { CouponCreateForm } from '@/web/components/reminders/reminders/reminders.marketing';
import { MarketingTabs } from '@/web/components/reminders/reminders/reminders.marketing-tabs';
import { Badge, Card, Forbidden, PageHeader, Stat, type Tone } from '@/web/components/ui/ui/ui';
import { createCouponAction, setCouponActiveAction } from '@/api/actions/coupons/coupons/coupons.actions';
import { COUPON_KIND_LABEL } from '@/api/services/coupons/coupons/coupons.service';
import type { CouponDto } from '@/api/types/coupons/coupons/coupons.types';
import { today } from '@/api/lib/clock/clock/clock';
import { listCoupons } from '@/api/dal/coupons/coupons/coupons.dal';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'คูปอง' };

const STATE: Record<CouponDto['state'], { label: string; tone: Tone }> = {
  active: { label: 'ใช้งาน', tone: 'lime' },
  exhausted: { label: 'ครบสิทธิ์', tone: 'muted' },
  expired: { label: 'หมดเขต', tone: 'muted' },
  off: { label: 'ปิดอยู่', tone: 'danger' },
};

const usage = (c: CouponDto) => (c.limit ? `${String(c.used)} / ${String(c.limit)}` : `${String(c.used)} ครั้ง`);
const conditions = (c: CouponDto) => [c.description, c.renewOnly ? 'เฉพาะต่ออายุ' : null, c.newOnly ? 'เฉพาะสมาชิกใหม่' : null].filter(Boolean).join(' · ');

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
  if (!allowed) return <Forbidden />;
  const [coupons, packages] = await Promise.all([listCoupons(session), listPackages(session)]);
  const promos = coupons.filter(c => c.kind !== 'referral');
  const referrals = coupons.filter(c => c.kind === 'referral');

  return (
    <>
      <PageHeader kicker={session.branch} title="การตลาด" />
      <MarketingTabs current="coupons" />

      <section aria-label="สรุปคูปอง" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รายได้จากคูปอง" value={formatBaht(coupons.reduce((s, c) => s + c.revenueSatang, 0))} hint="รวมทุกโค้ด" />
        <Stat label="ใช้งานอยู่" value={coupons.filter(c => c.state === 'active').length} hint={`จาก ${String(coupons.length)} โค้ด`} />
        <Stat label="ใช้ไปแล้ว" value={coupons.reduce((s, c) => s + c.used, 0)} hint="ครั้ง" />
        <Stat label="เพื่อนที่ถูกชวนมา" value={referrals.reduce((s, c) => s + c.used, 0)} hint={`${String(referrals.length)} โค้ดชวนเพื่อน`} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] xl:gap-5">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="คูปองทั้งหมด" subtitle="เคาน์เตอร์ใส่โค้ดตอนรับชำระ · สมาชิกใช้ในแอปหรือจากลิงก์ในข้อความเตือน">
            {/* มือถือ: การ์ด */}
            <ul className="flex flex-col gap-3 md:hidden">
              {promos.map(c => (
                <li key={c.code} className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
                  <div className="flex items-center justify-between gap-2"><b className="rounded-lg border border-dashed border-line px-2 font-mono text-lime">{c.code}</b><Badge tone={STATE[c.state].tone}>{STATE[c.state].label}</Badge></div>
                  <p className="text-sm">{c.label} <span className="text-muted">· {conditions(c)}</span></p>
                  <div className="flex items-center justify-between gap-3 text-sm text-muted"><span className="flex items-center gap-2"><Meter c={c} />{usage(c)}</span><b className="font-display text-ink">{formatBaht(c.revenueSatang)}</b></div>
                  <Toggle c={c} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="text-xs text-faint"><tr><th scope="col" className="py-2 pr-3 font-medium">โค้ด</th><th scope="col" className="px-3 py-2 font-medium">ส่วนลด</th><th scope="col" className="px-3 py-2 font-medium">ใช้แล้ว</th><th scope="col" className="px-3 py-2 font-medium">หมดเขต</th><th scope="col" className="px-3 py-2 text-right font-medium">รายได้</th><th scope="col" className="px-3 py-2 font-medium">สถานะ</th><th scope="col" className="py-2 pl-3"><span className="sr-only">จัดการ</span></th></tr></thead>
                <tbody className="ff-stagger divide-y divide-line">
                  {promos.map(c => (
                    <tr key={c.code}>
                      <th scope="row" className="py-3 pr-3 text-left font-normal"><b className="rounded-lg border border-dashed border-line px-2 font-mono text-lime">{c.code}</b><small className="mt-1 block text-xs text-muted">{conditions(c)}{c.kind === 'winback' && c.ownerName ? ` · ${c.ownerName}` : ''}</small></th>
                      <td className="px-3 py-3">{c.label}</td>
                      <td className="px-3 py-3"><Meter c={c} /><small className="text-xs text-muted">{usage(c)}</small></td>
                      <td className="px-3 py-3 text-muted">{c.expiresOn ? formatThaiDate(c.expiresOn) : '—'}</td>
                      <td className="px-3 py-3 text-right font-display tabular-nums">{formatBaht(c.revenueSatang)}</td>
                      <td className="px-3 py-3"><Badge tone={c.kind === 'winback' ? 'violet' : STATE[c.state].tone}>{c.kind === 'winback' ? COUPON_KIND_LABEL.winback : STATE[c.state].label}</Badge></td>
                      <td className="py-3 pl-3"><Toggle c={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="โค้ดชวนเพื่อน" subtitle="สมาชิกทุกคนมีโค้ดของตัวเองในแอป · เพื่อนลด ฿200 · เจ้าของโค้ดได้ +7 วันต่อเพื่อน 1 คน">
            {referrals.length === 0 ? <p className="text-sm text-muted">ยังไม่มีสมาชิกเปิดใช้โค้ดชวนเพื่อน</p> : (
              <ul className="divide-y divide-line">
                {referrals.map(c => (
                  <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                    <div><b className="font-mono text-violet">{c.code}</b><span className="block text-xs text-muted">{c.ownerName}</span></div>
                    <span className="flex items-center gap-3 text-muted"><Meter c={c} />เพื่อนสมัคร {c.used} คน</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="สร้างคูปอง">
          <CouponCreateForm packages={packages.filter(p => p.active).map(p => ({ id: p.id, name: p.name }))} action={createCouponAction} today={today()} />
        </Card>
      </div>
    </>
  );
}
