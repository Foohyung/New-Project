import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { BookOpen, ChartNoAxesCombined, Download, Package, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart } from '@/web/components/ui/ui/ui.bar-chart';
import { DateRangeFilter } from '@/web/components/ui/ui/ui.date-range-filter';
import { hrefWith } from '@/web/components/ui/ui/ui.view-switch';
import { ReportBranchFilter } from '@/web/components/reports/reports/reports.branch-filter';
import { monthStart, parseRange, rangeLabel, sameRange } from '@/api/services/shared/shared/shared.date-range';
import { today } from '@/api/lib/clock/clock/clock';
import { btn, Card, PageHeader, Stat } from '@/web/components/ui/ui/ui';
import { getReport, getReportBranches } from '@/api/dal/reports/reports/reports.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'รายงาน' };

const num = new Intl.NumberFormat('th-TH');
const short = (date: string) => String(Number(date.slice(8)));
const REPORTS = [
  { value: 'overview', label: 'ภาพรวม', icon: <ChartNoAxesCombined className="size-4" /> },
  { value: 'members', label: 'สมาชิก', icon: <Users className="size-4" /> },
  { value: 'courses', label: 'คอร์ส', icon: <BookOpen className="size-4" /> },
  { value: 'products', label: 'สินค้า', icon: <Package className="size-4" /> },
] as const;
type ReportType = (typeof REPORTS)[number]['value'];

function isReportType(value: unknown): value is ReportType {
  return typeof value === 'string' && REPORTS.some(report => report.value === value);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('reports.view');
  if (!allowed) return accessDenied();
  const query = await searchParams;
  const report: ReportType = isReportType(query.report) ? query.report : 'overview';
  const date = today();
  const defaultRange = { from: monthStart(date), to: date };
  const range = parseRange(query, date, defaultRange) ?? defaultRange;
  const requestedBranch = typeof query.branch === 'string' ? query.branch : undefined;
  const [branches, r] = await Promise.all([getReportBranches(session), getReport(session, range, requestedBranch)]);
  const isMonth = sameRange(range, defaultRange);
  const params = {
    ...(isMonth ? {} : { from: range.from, to: range.to }),
    ...(r.branch ? { branch: r.branch } : {}),
    ...(report === 'overview' ? {} : { report }),
  };
  const exportHref = hrefWith('/reports/export', {}, params);
  const totalByPackage = r.byPackage.reduce((sum, item) => sum + item.satang, 0);
  const branchLabel = r.branch ?? (branches.length > 1 ? session.role === 'owner' ? 'ทุกสาขาของฉัน' : 'ทุกสาขา' : session.branch);

  return (
    <>
      <PageHeader
        kicker={`${branchLabel} · ${rangeLabel(range)}`}
        title={report === 'overview' ? 'รายงาน' : `รายงาน${REPORTS.find(item => item.value === report)?.label ?? ''}`}
        actions={<a href={exportHref} download className={btn.secondary}><Download aria-hidden className="size-5" />ส่งออก CSV</a>}
      />

      <nav aria-label="ประเภทรายงาน" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {REPORTS.map(item => (
          <Link
            key={item.value}
            href={hrefWith('/reports', params, { report: item.value === 'overview' ? undefined : item.value })}
            aria-current={report === item.value ? 'page' : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg"
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {branches.length > 1 && (
        <ReportBranchFilter
          branches={branches}
          selected={r.branch}
          params={{ ...(isMonth ? {} : { from: range.from, to: range.to }), ...(report === 'overview' ? {} : { report }) }}
          allLabel={session.role === 'owner' ? 'ทุกสาขาของฉัน' : 'ทุกสาขา'}
        />
      )}
      <DateRangeFilter path="/reports" params={params} range={range} today={date} defaultRange={defaultRange} variant="heatmap" heatSatang={r.revenueByDay} />
      {range.from < r.dataFrom && <p className="-mt-2 text-xs text-faint">ข้อมูลตัวอย่างเริ่มที่ {formatThaiDate(r.dataFrom, 'long')} · วันก่อนหน้านั้นแสดงเป็น 0</p>}

      {report === 'overview' && (
        <>
          <section aria-label="ตัวเลขสำคัญ" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Stat tone="lime" label={isMonth ? 'รายได้เดือนนี้' : 'รายได้ในช่วงนี้'} value={formatBaht(r.revenue.totalSatang)} hint={isMonth ? `▲ ${String(r.revenue.changePct)}% จากช่วงเดียวกันเดือนก่อน` : `${String(r.revenue.daily.length)} วัน`} />
            <Stat label="เฉลี่ยต่อวัน" value={formatBaht(r.revenue.avgDailySatang)} hint={`ค้างรับ ${formatBaht(r.revenue.pendingSatang)}`} />
            <Stat label="สมาชิกที่ใช้งาน (เดือนนี้)" value={num.format(r.members.active)} hint={`ใหม่ ${String(r.members.newThisMonth)} · ต่ออายุ ${String(r.members.renewals)}`} />
            <Stat label="ไม่ต่ออายุ" value={num.format(r.members.lapsed)} hint="ควรทักไปชวนกลับมา" />
          </section>

          <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card title="รายได้รายวัน" subtitle={`${rangeLabel(range)} · แท่งสีเขียวคือวันนี้`}>
              <BarChart
                data={r.revenue.daily.map(day => ({ label: short(day.date), value: day.value }))}
                format={value => formatBaht(value)}
                highlight={short(r.to)}
                summary={`สูงสุด ${formatBaht(Math.max(...r.revenue.daily.map(day => day.value)))} · รวมช่วงนี้ ${formatBaht(r.revenue.totalSatang)}`}
              />
            </Card>
            <Card title="รายได้แยกตามรายการ" subtitle={`${branchLabel} · ${rangeLabel(range)}`}>
              <div className="grid gap-5">
                <section aria-label="รายได้จากแพ็กเกจ">
                  <h3 className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold">แพ็กเกจสมาชิก <span className="font-display">{formatBaht(totalByPackage)}</span></h3>
                  {r.byPackage.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากแพ็กเกจในช่วงนี้</p> : (
                    <ul className="flex flex-col gap-3">
                      {r.byPackage.map(item => (
                        <li key={item.id}>
                          <div className="flex items-baseline justify-between gap-3 text-sm"><span>{item.name} <small className="text-muted">· {num.format(item.count)} รายการ</small></span><b className="font-display">{formatBaht(item.satang)}</b></div>
                          <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String((item.satang / (totalByPackage || 1)) * 100)}%` }} className="block h-full rounded-full bg-cyan" /></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section aria-label="รายได้จากคอร์สเรียน" className="border-t border-line pt-4">
                  <h3 className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold">คอร์สเรียน <span className="font-display">{formatBaht(r.otherIncome.coursesSatang)}</span></h3>
                  {r.byCourse.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากคอร์สเรียนในช่วงนี้</p> : (
                    <ul className="grid gap-2 text-sm">
                      {r.byCourse.map(course => <li key={course.id} className="flex items-baseline justify-between gap-3"><span>{course.name} <small className="text-muted">· {num.format(course.count)} คน</small></span><b className="font-display">{formatBaht(course.satang)}</b></li>)}
                    </ul>
                  )}
                </section>
                <section aria-label="รายได้จากการซื้อสินค้า" className="border-t border-line pt-4">
                  <h3 className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold">ซื้อสินค้า <span className="font-display">{formatBaht(r.otherIncome.salesSatang)}</span></h3>
                  <p className="mb-2 text-xs text-muted">{num.format(r.otherIncome.salesCount)} บิล</p>
                  {r.byProduct.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากสินค้าในช่วงนี้</p> : (
                    <ul className="grid gap-2 text-sm">
                      {r.byProduct.map(product => <li key={product.id} className="flex items-baseline justify-between gap-3"><span>{product.name} <small className="text-muted">· {num.format(product.quantity)} ชิ้น</small></span><b className="font-display">{formatBaht(product.satang)}</b></li>)}
                    </ul>
                  )}
                </section>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <Card title="เช็กอินรายวัน" subtitle={rangeLabel(range)}>
              <BarChart
                data={r.checkIns.daily.map(day => ({ label: short(day.date), value: day.value }))}
                format={value => `${num.format(value)} คน`}
                highlight={short(r.to)}
                summary={`วันนี้ ${num.format(r.checkIns.today)} คน · เฉลี่ย ${num.format(r.checkIns.avg)} คน/วัน`}
              />
            </Card>
            <Card title="คลาสยอดนิยม 7 วันนี้" subtitle={`ที่นั่งเต็มเฉลี่ย ${String(r.classes.avgFillPct)}% · คิว PT ${String(r.classes.ptThisWeek)} คิว`}>
              <ol className="divide-y divide-line">
                {r.classes.top.map((course, index) => (
                  <li key={course.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 font-display font-semibold">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/classes/${course.id}`} className="tap block truncate font-medium hover:underline">{course.title}</Link>
                      <small className="text-xs text-muted">{formatThaiDateOf(course.startsAt)} · {formatThaiTime(course.startsAt)} น.</small>
                    </div>
                    <b className="font-display whitespace-nowrap">{Math.round((course.booked / course.capacity) * 100)}%</b>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}

      {report === 'members' && (
        <>
          <section aria-label="รายงานสมาชิก" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Stat tone="lime" label="รายได้แพ็กเกจในช่วงนี้" value={formatBaht(totalByPackage)} hint={`${num.format(r.byPackage.reduce((sum, item) => sum + item.count, 0))} รายการชำระ`} />
            <Stat label="สมาชิกที่ใช้งาน" value={num.format(r.members.active)} hint="ข้อมูลปัจจุบัน" />
            <Stat label="สมาชิกใหม่เดือนนี้" value={num.format(r.members.newThisMonth)} hint="ตั้งแต่ต้นเดือน" />
            <Stat label="ต่ออายุเดือนนี้" value={num.format(r.members.renewals)} hint={`ไม่ต่ออายุ ${num.format(r.members.lapsed)} คน`} />
          </section>
          <Card title="รายได้แยกตามแพ็กเกจ" subtitle={`${branchLabel} · ${rangeLabel(range)}`}>
            {r.byPackage.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากแพ็กเกจในช่วงนี้</p> : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {r.byPackage.map(item => (
                  <li key={item.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span>{item.name}</span><b className="font-display">{formatBaht(item.satang)}</b></div>
                    <p className="mt-1 text-xs text-muted">{num.format(item.count)} รายการ</p>
                    <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String((item.satang / (totalByPackage || 1)) * 100)}%` }} className="block h-full rounded-full bg-cyan" /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {report === 'courses' && (
        <>
          <section aria-label="รายงานคอร์ส" className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            <Stat tone="lime" label="รายได้จากคอร์ส" value={formatBaht(r.otherIncome.coursesSatang)} hint={rangeLabel(range)} />
            <Stat label="ผู้สมัครที่ชำระแล้ว" value={num.format(r.byCourse.reduce((sum, course) => sum + course.count, 0))} hint={`${num.format(r.byCourse.length)} คอร์ส`} />
            <Stat label="รายได้รวมทุกช่องทาง" value={formatBaht(r.revenue.totalSatang)} hint="เพื่อเปรียบเทียบภาพรวม" />
          </section>
          <Card title="รายได้แยกตามคอร์ส" subtitle={`${branchLabel} · ${rangeLabel(range)}`}>
            {r.byCourse.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากคอร์สในช่วงนี้</p> : (
              <ul className="divide-y divide-line">
                {r.byCourse.map(course => (
                  <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="font-medium">{course.name}<small className="ml-2 text-muted">· {num.format(course.count)} คน</small></span>
                    <b className="font-display">{formatBaht(course.satang)}</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {report === 'products' && (
        <>
          <section aria-label="รายงานสินค้า" className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            <Stat tone="lime" label="รายได้จากสินค้า" value={formatBaht(r.otherIncome.salesSatang)} hint={rangeLabel(range)} />
            <Stat label="จำนวนบิล" value={num.format(r.otherIncome.salesCount)} hint="ไม่รวมบิลที่ยกเลิก" />
            <Stat label="จำนวนสินค้าที่ขาย" value={num.format(r.byProduct.reduce((sum, product) => sum + product.quantity, 0))} hint={`${num.format(r.byProduct.length)} รายการสินค้า`} />
          </section>
          <Card title="ยอดขายแยกตามสินค้า" subtitle={`${branchLabel} · ${rangeLabel(range)}`}>
            {r.byProduct.length === 0 ? <p className="text-sm text-muted">ไม่มีรายได้จากสินค้าในช่วงนี้</p> : (
              <ul className="divide-y divide-line">
                {r.byProduct.map(product => (
                  <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="font-medium">{product.name}<small className="ml-2 text-muted">· {num.format(product.quantity)} ชิ้น</small></span>
                    <b className="font-display">{formatBaht(product.satang)}</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}
