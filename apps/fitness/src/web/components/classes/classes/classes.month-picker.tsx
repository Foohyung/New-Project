'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { inputClass } from '@/web/components/ui/ui/ui';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export function ClassMonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(Number(value.slice(5, 7)) - 1);
  const [year, setYear] = useState(String(Number(value.slice(0, 4)) + 543));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectedLabel = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', month: 'long', year: 'numeric' })
    .format(new Date(`${value}-01T00:00:00Z`));
  const buddhistYear = Number(year);
  const validYear = Number.isInteger(buddhistYear) && buddhistYear >= 2443 && buddhistYear <= 10542;

  function applyMonth(selectedMonth = month) {
    if (!validYear) return;
    const gregorianYear = buddhistYear - 543;
    const params = new URLSearchParams(window.location.search);
    params.set('period', 'month');
    params.set('from', `${String(gregorianYear).padStart(4, '0')}-${String(selectedMonth + 1).padStart(2, '0')}-01`);
    router.push(`/classes?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen(current => !current); }}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm font-semibold text-ink transition-colors hover:border-muted focus-visible:border-lime"
      >
        <CalendarDays aria-hidden className="size-4 text-lime" />
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="dialog" aria-label="เลือกเดือนและปี" className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_50px_-16px_#000]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">เลือกช่วงปฏิทิน</p>
              <h2 className="font-display text-lg font-semibold">{MONTHS[month]} {year}</h2>
            </div>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              ปี พ.ศ.
              <input
                type="number"
                min={2443}
                max={10542}
                value={year}
                onChange={event => { setYear(event.currentTarget.value); }}
                onKeyDown={event => { if (event.key === 'Enter') applyMonth(); }}
                className={`${inputClass} h-10 min-h-10 w-24 px-2 text-center text-sm tabular-nums`}
                aria-label="ปี พ.ศ."
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {MONTHS.map((name, index) => (
              <button
                key={name}
                type="button"
                aria-pressed={month === index}
                onClick={() => { setMonth(index); applyMonth(index); }}
                disabled={!validYear}
                className={`min-h-10 rounded-xl border px-2 text-sm font-medium transition-colors ${month === index ? 'border-lime bg-lime text-bg' : 'border-line bg-bg text-muted hover:border-lime/50 hover:text-ink'}`}
              >
                {name}
              </button>
            ))}
          </div>
          {!validYear && <p role="alert" className="mt-3 text-xs text-danger">กรุณาระบุปี พ.ศ. ระหว่าง 2443 ถึง 10542</p>}
        </div>
      )}
    </div>
  );
}
