import { formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart } from '@/components/bar-chart';
import { btn, Card, Forbidden, PageHeader, Stat } from '@/components/ui';
import { getReport } from '@/server/dal/reports';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'รายงาน' };

const num = new Intl.NumberFormat('th-TH');
const short = (date: string) => String(Number(date.slice(8)));

export default async function ReportsPage() {
  const { session, allowed } = await pageGuard('reports.view');
  if (!allowed) return <Forbidden />;
  const r = await getReport(session);
  const totalByPackage = r.byPackage.reduce((s, p) => s + p.satang, 0);

  return (
    <>
      <PageHeader
        kicker={`${session.branch} · ${formatThaiDate(r.monthLabelFrom)} – ${formatThaiDate(r.to)}`}
        title="รายงาน"
        actions={<a href="/reports/export" download className={btn.secondary}><Download aria-hidden className="size-5" />ส่งออก CSV</a>}
      />

      <section aria-label="ตัวเลขสำคัญเดือนนี้" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat tone="lime" label="รายได้เดือนนี้" value={formatBaht(r.revenue.monthSatang)} hint={`▲ ${String(r.revenue.changePct)}% จากช่วงเดียวกันเดือนก่อน`} />
        <Stat label="เฉลี่ยต่อวัน" value={formatBaht(r.revenue.avgDailySatang)} hint={`ค้างรับ ${formatBaht(r.revenue.pendingSatang)}`} />
        <Stat label="สมาชิกที่ใช้งาน" value={num.format(r.members.active)} hint={`ใหม่ ${String(r.members.newThisMonth)} · ต่ออายุ ${String(r.members.renewals)}`} />
        <Stat label="ไม่ต่ออายุ" value={num.format(r.members.lapsed)} hint="ควรทักไปชวนกลับมา" />
      </section>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="รายได้รายวัน" subtitle="30 วันล่าสุด · แท่งสีเขียวคือวันนี้">
          <BarChart
            data={r.revenue.daily.map(d => ({ label: short(d.date), value: d.value }))}
            format={v => formatBaht(v)}
            highlight={short(r.to)}
            summary={`วันนี้ ${formatBaht(r.revenue.daily.find(d => d.date === r.to)?.value ?? 0)} · สูงสุด ${formatBaht(Math.max(...r.revenue.daily.map(d => d.value)))} · เดือนนี้รวม ${formatBaht(r.revenue.monthSatang)}`}
          />
        </Card>
        <Card title="ยอดขายตามแพ็กเกจ" subtitle="เดือนนี้">
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
        <Card title="เช็กอินรายวัน" subtitle="14 วันล่าสุด">
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
