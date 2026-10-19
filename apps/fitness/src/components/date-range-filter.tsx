'use client';

import { formatBaht } from '@repo/utils';
import { CalendarRange } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { futurePresetRanges, presetRanges, rangeLabel, sameRange, type DateRange } from '@/features/shared/date-range';
import { DateRangePicker, type HeatCell, type RangeVariant } from './calendar';
import { hrefWith, type Params } from './view-switch';

/**
 * ตัวกรองช่วงวันที่ from–to (§15.6) — ค่าอยู่ใน URL (?from=&to=) ตัวกรองอื่นในหน้ายังคงอยู่
 * variant: dual = 2 เดือน (การเงิน) · compact = 1 เดือน · heatmap = มียอดรายวัน (รายงาน)
 */
export function DateRangeFilter({ path, params, range, today, label = 'ช่วงวันที่', allowAll = false, defaultRange = null, future = false, variant = 'compact', heatSatang }: {
  path: string;
  params: Params;
  range: DateRange | null;
  today: string;
  label?: string;
  allowAll?: boolean;
  defaultRange?: DateRange | null;
  /** ช่วงด่วนแบบไปข้างหน้า และเลือกวันในอนาคตได้ */
  future?: boolean;
  variant?: RangeVariant;
  /** ยอดรายวัน (สตางค์) สำหรับ heatmap */
  heatSatang?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const presets = future ? futurePresetRanges(today) : presetRanges(today);

  const go = (r: DateRange | null) => {
    const target = r === null && !allowAll ? defaultRange : r;
    const patch = sameRange(target, defaultRange) ? { from: undefined, to: undefined } : { from: target?.from, to: target?.to };
    startTransition(() => { router.push(hrefWith(path, params, patch), { scroll: false }); });
  };

  // ระดับสีของ heatmap แบ่งตามช่วงยอด (สามส่วนเท่า ๆ กันของวันที่มียอด)
  const values = heatSatang ? Object.values(heatSatang).filter(v => v > 0).sort((a, b) => a - b) : [];
  const cut = (q: number) => values[Math.floor(values.length * q)] ?? 0;
  const [low, high] = [cut(1 / 3), cut(2 / 3)];
  const heat = heatSatang
    ? (date: string): HeatCell | undefined => {
        const v = heatSatang[date];
        if (!v) return undefined;
        return { level: v >= high ? 3 : v >= low ? 2 : 1, label: `${String(Math.round(v / 100_000))}k` };
      }
    : undefined;
  const heatTotal = heatSatang
    ? (r: DateRange) => formatBaht(Object.entries(heatSatang).filter(([d]) => d >= r.from && d <= r.to).reduce((s, [, v]) => s + v, 0))
    : undefined;

  return (
    <section aria-label={label} aria-busy={pending} className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${pending ? 'opacity-70' : ''}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CalendarRange aria-hidden className="size-4 text-lime" />{label}
        <span className="font-normal text-muted">· {rangeLabel(range)}</span>
      </p>
      <div className="w-full sm:w-auto sm:min-w-72">
        <DateRangePicker value={range} onApply={go} today={today} variant={variant} presets={presets} maxDate={future ? undefined : today} heat={heat} heatTotal={heatTotal} label={label} />
      </div>
    </section>
  );
}
