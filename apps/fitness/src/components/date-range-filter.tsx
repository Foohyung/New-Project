import { CalendarRange } from 'lucide-react';
import Link from 'next/link';
import { futurePresetRanges, presetRanges, rangeLabel, sameRange, type DateRange } from '@/features/shared/date-range';
import { btn, inputClass } from './ui';
import { hrefWith, type Params } from './view-switch';

/**
 * ตัวกรองช่วงวันที่ from–to ใช้ร่วมทุกหน้า: ปุ่มช่วงด่วน + ช่องเลือกวัน (ฟอร์ม GET — ทำงานได้แม้ไม่มี JS)
 * ค่าอยู่ใน URL (?from=&to=) จึงแชร์ลิงก์/กดย้อนกลับได้ และตัวกรองอื่นในหน้ายังคงอยู่
 */
export function DateRangeFilter({ path, params, range, today, label = 'ช่วงวันที่', allowAll = false, defaultRange = null, future = false }: { path: string; params: Params; range: DateRange | null; today: string; label?: string; allowAll?: boolean; defaultRange?: DateRange | null; /** ช่วงด่วนแบบไปข้างหน้า และเลือกวันในอนาคตได้ */ future?: boolean }) {
  const presets = future ? futurePresetRanges(today) : presetRanges(today);
  // ช่วงที่ตรงกับค่าเริ่มต้นไม่ต้องใส่ใน URL
  const hrefFor = (r: DateRange | null) => hrefWith(path, params, sameRange(r, defaultRange) ? { from: undefined, to: undefined } : { from: r?.from, to: r?.to });
  const chip = 'inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3.5 text-sm font-medium text-muted hover:text-ink aria-[current=true]:border-lime aria-[current=true]:bg-lime/10 aria-[current=true]:text-lime';
  return (
    <section aria-label={label} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><CalendarRange aria-hidden className="size-4 text-lime" />{label}<span className="font-normal text-muted">· {rangeLabel(range)}</span></p>
        <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {allowAll && <Link href={hrefFor(null)} scroll={false} aria-current={range === null ? 'true' : undefined} className={chip}>ทั้งหมด</Link>}
          {presets.map(p => (
            <Link key={p.key} href={hrefFor(p.range)} scroll={false} aria-current={sameRange(range, p.range) ? 'true' : undefined} className={chip}>{p.label}</Link>
          ))}
        </div>
      </div>
      <form method="get" action={path} className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
        {Object.entries(params).map(([k, v]) => (k !== 'from' && k !== 'to' && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
          ตั้งแต่
          <input type="date" name="from" defaultValue={range?.from} max={future ? undefined : today} className={`${inputClass} min-h-11 px-3`} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
          ถึง
          <input type="date" name="to" defaultValue={range?.to} max={future ? undefined : today} className={`${inputClass} min-h-11 px-3`} />
        </label>
        <button type="submit" className={`${btn.secondary} col-span-2 sm:col-span-1`}>ใช้ช่วงนี้</button>
      </form>
    </section>
  );
}
