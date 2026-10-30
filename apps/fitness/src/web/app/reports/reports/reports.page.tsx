import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@/api/lib/utils/utils/utils';
import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart } from '@/web/components/ui/ui/ui.bar-chart';
import { DateRangeFilter } from '@/web/components/ui/ui/ui.date-range-filter';
import { hrefWith } from '@/web/components/ui/ui/ui.view-switch';
import { monthStart, parseRange, rangeLabel, sameRange } from '@/api/services/shared/shared/shared.date-range';
import { today } from '@/api/lib/clock/clock/clock';
import { btn, Card, Forbidden, PageHeader, Stat } from '@/web/components/ui/ui/ui';
import { getReport } from '@/api/dal/reports/reports/reports.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'รายงาน' };

const num = new Intl.NumberFormat('th-TH');
const short = (date: string) => String(Number(date.slice(8)));

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, allowed } = await pageGuard('reports.view');
  if (!allowed) return <Forbidden />;
  const query = await searchParams;
  const date = today();
  const defaultRange = { from: monthStart(date), to: date };
  const range = parseRange(query, date, defaultRange) ?? defaultRange;
  const r = await getReport(session, range);
  const isMonth = sameRange(range, defaultRange);
  const params = sameRange(range, defaultRange) ? {} : { from: range.from, to: range.to };
  const exportHref = hrefWith('/reports/export', {}, params);
  const totalByPackage = r.byPackage.reduce((s, p) => s + p.satang, 0);

  return (
    <>
      <PageHeader
        kicker={`${session.branch} · ${rangeLabel(range)}`}
        title="รายงาน"
        actions={<a href={exportHref} download className={btn.secondary}><Download aria-hidden className="size-5" />ส่งออก CSV</a>}
      />

      <DateRangeFilter path="/reports" params={params} range={range} today={date} defaultRange={defaultRange} variant="heatmap" heatSatang={r.revenueByDay} />
      {range.from < r.dataFrom && <p className="-mt-2 text-xs text-faint">ข้อมูลตัวอย่างเริ่มที่ {formatThaiDate(r.dataFrom, 'long')} · วันก่อนหน้านั้นแสดงเป็น 0</p>}

      <section aria-label="ตัวเลขสำคัญ" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label={isMonth ? 'รายได้เดือนนี้' : 'รายได้ในช่วงนี้'} value={formatBaht(r.revenue.totalSatang)} hint={isMonth ? `▲ ${String(r.revenue.changePct)}% จากช่วงเดียวกันเดือนก่อน` : `${String(r.revenue.daily.length)} วัน`} />
        <Stat label="เฉลี่ยต่อวัน" value={formatBaht(r.revenue.avgDailySatang)} hint={`ค้างรับ ${formatBaht(r.revenue.pendingSatang)}`} />
        <Stat label="สมาชิกที่ใช้งาน (เดือนนี้)" value={num.format(r.members.active)} hint={`ใหม่ ${String(r.members.newThisMonth)} · ต่ออายุ ${String(r.members.renewals)}`} />
        <Stat label="ไม่ต่ออายุ" value={num.format(r.members.lapsed)} hint="ควรทักไปชวนกลับมา" />
      </section>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="รายได้รายวัน" subtitle={`${rangeLabel(range)} · แท่งสีเขียวคือวันนี้`}>
          <BarChart
            data={r.revenue.daily.map(d => ({ label: short(d.date), value: d.value }))}
            format={v => formatBaht(v)}
            highlight={short(r.to)}
            summary={`สูงสุด ${formatBaht(Math.max(...r.revenue.daily.map(d => d.value)))} · รวมช่วงนี้ ${formatBaht(r.revenue.totalSatang)}`}
          />
        </Card>
        <Card title="ยอดขายตามแพ็กเกจ" subtitle={rangeLabel(range)}>
          <ul className="flex flex-col gap-3">
            {r.byPackage.map(p => (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span>{p.name}</span><b className="font-display">{formatBaht(p.satang)}</b></div>
                <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${String((p.satang / totalByPackage) * 100)}%` }} className="block h-full rounded-full bg-cyan" /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card title="เช็กอินรายวัน" subtitle={rangeLabel(range)}>
          <BarChart
            data={r.checkIns.daily.map(d => ({ label: short(d.date), value: d.value }))}
            format={v => `${num.format(v)} คน`}
            highlight={short(r.to)}
            summary={`วันนี้ ${num.format(r.checkIns.today)} คน · เฉลี่ย ${num.format(r.checkIns.avg)} คน/วัน`}
          />
        </Card>
        <Card title="คลาสยอดนิยม 7 วันนี้" subtitle={`ที่นั่งเต็มเฉลี่ย ${String(r.classes.avgFillPct)}% · คิว PT ${String(r.classes.ptThisWeek)} คิว`}>
          <ol className="divide-y divide-line">
            {r.classes.top.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 font-display font-semibold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/classes/${c.id}`} className="tap block truncate font-medium hover:underline">{c.title}</Link>
                  <small className="text-xs text-muted">{formatThaiDateOf(c.startsAt)} · {formatThaiTime(c.startsAt)} น.</small>
                </div>
                <b className="font-display whitespace-nowrap">{Math.round((c.booked / c.capacity) * 100)}%</b>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
