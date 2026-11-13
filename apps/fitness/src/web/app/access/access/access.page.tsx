import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronFirst, ChevronLast, LogIn, LogOut } from 'lucide-react';
import { getAccessLog } from '@/api/dal/access/access/access.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { today } from '@/api/lib/clock/clock/clock';
import { isLoopbackIp } from '@/api/services/access/access/access.service';
import { parseRange, rangeLabel, type DateRange } from '@/api/services/shared/shared/shared.date-range';
import { Badge, Card, EmptyState, PageHeader, Stat, btn } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { AccessLogFilters } from './access.filters';

export const metadata: Metadata = { title: 'ประวัติการเข้าสู่ระบบ' };

const IP = /^[0-9a-fA-F.:]{2,45}$/;

/** เวลาไทยถึงวินาที เช่น 18:42:05 */
const timeWithSeconds = (iso: string) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso));

/** ใครเข้า/ออกจากระบบ เมื่อไร จาก IP ไหน อุปกรณ์อะไร — อ่านจาก audit_logs (auth.login / auth.logout) */
export default async function AccessLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('access.view');
  if (!allowed || session.role !== 'admin') return accessDenied();
  const params = await searchParams;
  const currentDate = today();
  const defaultRange: DateRange = { from: currentDate, to: currentDate };
  const legacyDate = typeof params.date === 'string' ? parseRange({ from: params.date, to: params.date }, currentDate) : null;
  const range = parseRange(params, currentDate, legacyDate ?? defaultRange) ?? defaultRange;
  const ip = typeof params.ip === 'string' && IP.test(params.ip.trim()) ? params.ip.trim() : undefined;
  const requestedPage = typeof params.page === 'string' && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const log = await getAccessLog(session, { ...range, ip, page: requestedPage });
  const hasLoopback = log.events.some(e => e.ip && isLoopbackIp(e.ip));
  const firstItem = log.total === 0 ? 0 : (log.page - 1) * log.pageSize + 1;
  const lastItem = Math.min(log.page * log.pageSize, log.total);
  const pageHref = (page: number) => {
    const query = new URLSearchParams({ from: range.from, to: range.to, page: String(page) });
    if (ip) query.set('ip', ip);
    return `/access-logs?${query.toString()}`;
  };
  const firstPageNumber = Math.max(1, Math.min(log.page - 1, log.totalPages - 3));
  const pageNumbers = Array.from({ length: Math.min(4, log.totalPages) }, (_, index) => firstPageNumber + index);

  return (
    <>
      <PageHeader kicker={rangeLabel(range)} title="ประวัติการเข้าสู่ระบบ" />
      <section aria-label="สรุป" className="grid grid-cols-3 gap-3 lg:gap-4">
        <Stat tone="lime" label="เข้าสู่ระบบ" value={log.logins} hint="ครั้ง" />
        <Stat label="ออกจากระบบ" value={log.logouts} hint="ครั้ง" />
        <Stat label="จำนวน IP" value={log.ipCount} hint={ip ? `กรองเฉพาะ ${ip}` : 'เครื่องที่ใช้'} />
      </section>

      <AccessLogFilters from={range.from} to={range.to} ip={ip} today={currentDate} />

      {hasLoopback && (
        <p role="note" className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          IP <b className="font-mono">127.0.0.1</b> หรือ <b className="font-mono">::1</b> คือเครื่องเซิร์ฟเวอร์เอง — เกิดเมื่อเปิดเว็บจากตัวเซิร์ฟเวอร์ (localhost) หรือเข้าผ่าน IIS ที่ยังไม่ได้ส่ง IP จริงมา
          (IIS Manager → Application Request Routing Cache → Server Proxy Settings → ติ๊ก Preserve client IP ใน header X-Forwarded-For)
        </p>
      )}

      <Card title="เข้า/ออกจากระบบ" subtitle={`${rangeLabel(range)} · ใหม่สุดก่อน · แสดง ${firstItem}–${lastItem} จาก ${log.total} รายการ · กด IP เพื่อดูเฉพาะเครื่องนั้น`}>
        {log.events.length === 0 ? (
          <EmptyState>ไม่มีการเข้าหรือออกจากระบบในวันที่เลือก</EmptyState>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="text-xs text-faint">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">เวลา</th>
                  <th scope="col" className="px-5 py-3 font-medium">รายการ</th>
                  <th scope="col" className="px-5 py-3 font-medium">ผู้ใช้</th>
                  <th scope="col" className="px-5 py-3 font-medium">IP</th>
                  <th scope="col" className="px-5 py-3 font-medium">อุปกรณ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {log.events.map(e => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 whitespace-nowrap tabular-nums text-muted">{timeWithSeconds(e.at)}</td>
                    <td className="px-5 py-3">
                      {e.kind === 'login'
                        ? <Badge tone="lime"><LogIn aria-hidden className="mr-1 inline size-3.5" />เข้าสู่ระบบ</Badge>
                        : <Badge><LogOut aria-hidden className="mr-1 inline size-3.5" />ออกจากระบบ</Badge>}
                    </td>
                    <th scope="row" className="px-5 py-3 text-left font-normal">
                      {e.userName}
                      <small className="block text-xs text-muted">{[e.roleName, e.branch].filter(Boolean).join(' · ')}</small>
                    </th>
                    <td className="px-5 py-3 font-mono">
                      {e.ip ? <Link href={`/access-logs?from=${range.from}&to=${range.to}&ip=${encodeURIComponent(e.ip)}`} className="text-lime hover:underline">{e.ip}</Link> : <span className="text-muted">ไม่ได้บันทึก</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {log.totalPages > 1 && (
          <nav aria-label="เปลี่ยนหน้าประวัติการเข้าสู่ระบบ" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">หน้า {log.page} จาก {log.totalPages}</p>
            <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
              {log.page > 1 && (
                <Link href={pageHref(1)} aria-label="ไปหน้าแรกสุด" title="หน้าแรกสุด" className="inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted hover:border-lime/50 hover:text-ink">
                  <ChevronFirst aria-hidden className="size-4" />
                </Link>
              )}
              {log.page > 1 && <Link href={pageHref(log.page - 1)} rel="prev" className={btn.secondary}>ก่อนหน้า</Link>}
              {pageNumbers.map(page => (
                <Link
                  key={page}
                  href={pageHref(page)}
                  aria-current={page === log.page ? 'page' : undefined}
                  aria-label={`หน้า ${page}`}
                  className={`inline-flex size-10 items-center justify-center rounded-xl border text-sm font-semibold ${page === log.page ? 'border-lime bg-lime text-bg' : 'border-line bg-surface-2 text-muted hover:border-lime/50 hover:text-ink'}`}
                >
                  {page}
                </Link>
              ))}
              {log.page < log.totalPages && <Link href={pageHref(log.page + 1)} rel="next" className={btn.secondary}>ถัดไป</Link>}
              {log.page < log.totalPages && (
                <Link href={pageHref(log.totalPages)} aria-label="ไปหน้าสุดท้าย" title="หน้าสุดท้าย" className="inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted hover:border-lime/50 hover:text-ink">
                  <ChevronLast aria-hidden className="size-4" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </Card>
    </>
  );
}
