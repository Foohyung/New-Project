'use client';

import { addDays, daysBetween } from '@repo/utils';
import { CalendarDays, ChevronLeft, ChevronRight, MoveRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { DateRange } from '@/features/shared/date-range';
import { btn } from './ui';

/* ---------- ตัวช่วยวันที่ (ปี พ.ศ. · เวลาไทยเป็น YYYY-MM-DD อยู่แล้ว) ---------- */
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

type Month = { y: number; m: number };
const ym = (date: string): Month => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 });
const iso = (y: number, m: number, d: number) => `${String(y)}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const shift = (v: Month, n: number): Month => {
  const t = v.y * 12 + v.m + n;
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
};
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const thaiDate = (date: string) => `${String(Number(date.slice(8)))} ${SHORT[Number(date.slice(5, 7)) - 1] ?? ''} ${String(Number(date.slice(0, 4)) + 543)}`;

export function thaiRange(r: DateRange): string {
  if (r.from === r.to) return thaiDate(r.from);
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4);
  const sameMonth = sameYear && r.from.slice(5, 7) === r.to.slice(5, 7);
  const from = sameMonth ? String(Number(r.from.slice(8))) : sameYear ? thaiDate(r.from).replace(/ \d+$/, '') : thaiDate(r.from);
  return `${from} – ${thaiDate(r.to)}`;
}

export interface HeatCell {
  /** 0 = ไม่มีข้อมูล, 1–3 = ความเข้ม */
  level: 0 | 1 | 2 | 3;
  label: string;
}

const HEAT = ['', 'bg-accent/10', 'bg-accent/20', 'bg-accent/35'];

/**
 * ตารางวันของเดือน — ใช้คีย์บอร์ดได้ (← → ↑ ↓ เลื่อนวัน/สัปดาห์, PageUp/PageDown เปลี่ยนเดือน, Enter เลือก)
 * โฟกัสแบบ roving tabindex: กด Tab เข้ามาจะอยู่ที่วันที่เลือก/วันนี้
 */
function MonthGrid({ view, today, selected, isDisabled, onPick, focus, onFocusDate, heat, label }: {
  view: Month;
  today: string;
  selected: { from: string | null; to: string | null };
  isDisabled: (date: string) => boolean;
  onPick: (date: string) => void;
  focus: string;
  onFocusDate: (date: string) => void;
  heat?: (date: string) => HeatCell | undefined;
  label: string;
}) {
  const first = iso(view.y, view.m, 1);
  const start = addDays(first, -weekday(first));
  const lastDay = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const weeks = Math.ceil((weekday(first) + lastDay) / 7);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus]);

  const onKeyDown = (e: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, PageUp: -30, PageDown: 30 };
    const step = steps[e.key];
    if (step === undefined) return;
    e.preventDefault();
    onFocusDate(addDays(focus, step));
  };

  const { from, to } = selected;
  const end = to ?? from;
  return (
    <div className="min-w-0">
      <div role="grid" aria-label={label} ref={ref} onKeyDown={onKeyDown} className="grid grid-cols-7">
        <div role="row" className="contents">
          {DOW.map((d, i) => <span key={d} role="columnheader" className={`pb-1.5 text-center text-[11px] font-semibold ${i === 0 || i === 6 ? 'text-danger/70' : 'text-faint'}`}>{d}</span>)}
        </div>
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} role="row" className="contents">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(start, w * 7 + i);
              const outside = date.slice(0, 7) !== first.slice(0, 7);
              if (outside) return <span key={date} role="gridcell" aria-hidden className="h-10" />;
              const disabled = isDisabled(date);
              const inRange = from !== null && end !== null && date >= from && date <= end;
              const isEdge = date === from || date === end;
              const h = heat?.(date);
              return (
                <span key={date} role="gridcell" aria-selected={inRange} className={`relative flex h-10 items-center justify-center ${inRange && !isEdge ? 'bg-accent/12' : ''} ${inRange && date === from && end !== from ? 'bg-gradient-to-r from-transparent from-50% to-accent/12 to-50%' : ''} ${inRange && date === end && end !== from ? 'bg-gradient-to-l from-transparent from-50% to-accent/12 to-50%' : ''}`}>
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === focus ? 0 : -1}
                    disabled={disabled}
                    aria-label={`${thaiDate(date)}${date === today ? ' (วันนี้)' : ''}`}
                    aria-current={date === today ? 'date' : undefined}
                    onClick={() => { onPick(date); }}
                    onFocus={() => { if (date !== focus) onFocusDate(date); }}
                    className={`relative z-[1] flex size-[38px] flex-col items-center justify-center rounded-xl text-[13.5px] leading-none tabular-nums outline-offset-1 disabled:cursor-not-allowed disabled:text-faint/50 disabled:line-through
                      ${isEdge ? 'bg-accent font-bold text-on-accent' : `${h ? HEAT[h.level] : ''} enabled:hover:bg-surface-2`}
                      ${date === today && !isEdge ? 'text-accent ring-1 ring-accent ring-inset' : ''}`}
                  >
                    {Number(date.slice(8))}
                    {h && h.level > 0 && <span className={`mt-0.5 text-[9px] font-medium ${isEdge ? 'text-on-accent/70' : 'text-muted'}`}>{h.label}</span>}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthHeader({ view, onPrev, onNext, hidePrev, hideNext }: { view: Month; onPrev: () => void; onNext: () => void; hidePrev?: boolean; hideNext?: boolean }) {
  const nav = 'grid size-9 place-items-center rounded-[10px] border border-line text-muted hover:bg-surface-2 hover:text-ink';
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button type="button" onClick={onPrev} aria-label="เดือนก่อน" className={`${nav} ${hidePrev ? 'sm:invisible' : ''}`}><ChevronLeft aria-hidden className="size-4" /></button>
      <span aria-live="polite" className="text-[15px] font-semibold">{MONTHS[view.m]} {view.y + 543}</span>
      <button type="button" onClick={onNext} aria-label="เดือนถัดไป" className={`${nav} ${hideNext ? 'sm:invisible' : ''}`}><ChevronRight aria-hidden className="size-4" /></button>
    </div>
  );
}

/** popover บนจอใหญ่ · sheet จากด้านล่างบนมือถือ — ปิดด้วย Esc / คลิกข้างนอก */
function Popover({ open, onClose, align = 'end', children, label }: { open: boolean; onClose: () => void; align?: 'start' | 'end'; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-cal-trigger]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    // ป๊อปอัปที่เปิดใกล้ขอบล่างจอ เลื่อนหน้าให้เห็นครบ
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40 bg-black/50 sm:hidden" />
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-20px_40px_-20px_#000] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-none sm:rounded-2xl sm:p-0 sm:shadow-[0_30px_60px_-30px_#000] ${align === 'end' ? 'sm:right-0' : 'sm:left-0'}`}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        {children}
      </div>
    </>
  );
}

function TriggerButton({ open, onClick, children, id, invalid, describedBy }: { open: boolean; onClick: () => void; children: ReactNode; id?: string; invalid?: boolean; describedBy?: string }) {
  return (
    <button
      id={id}
      type="button"
      data-cal-trigger
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-describedby={describedBy}
      data-invalid={invalid ? true : undefined}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-line bg-bg px-4 text-left font-semibold text-ink hover:border-muted aria-expanded:border-accent data-[invalid=true]:border-danger"
    >
      <CalendarDays aria-hidden className="size-[18px] shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/* ---------- เลือกช่วงวันที่ (แบบ A / B / C) ---------- */

export type RangeVariant = 'dual' | 'compact' | 'heatmap';

export function DateRangePicker({ value, onApply, today, variant, presets, maxDate, heat, heatTotal, label = 'เลือกช่วงวันที่' }: {
  value: DateRange | null;
  onApply: (range: DateRange | null) => void;
  today: string;
  variant: RangeVariant;
  presets: { key: string; label: string; range: DateRange }[];
  /** วันสุดท้ายที่เลือกได้ (ตัวกรองย้อนหลัง = วันนี้) */
  maxDate?: string;
  heat?: (date: string) => HeatCell | undefined;
  heatTotal?: (range: DateRange) => string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>({ from: value?.from ?? null, to: value?.to ?? null });
  const anchor = value?.to ?? maxDate ?? today;
  const [view, setView] = useState<Month>(variant === 'dual' ? shift(ym(anchor), -1) : ym(anchor));
  const [focus, setFocus] = useState(value?.from ?? today);
  const dialogId = useId();

  const openPicker = () => {
    setDraft({ from: value?.from ?? null, to: value?.to ?? null });
    setView(variant === 'dual' ? shift(ym(anchor), -1) : ym(anchor));
    setOpen(o => !o);
  };
  const pick = (date: string) => {
    setDraft(d => (!d.from || d.to ? { from: date, to: null } : date < d.from ? { from: date, to: d.from } : { from: d.from, to: date }));
  };
  const focusDate = (date: string) => {
    setFocus(date);
    const months = variant === 'dual' ? [view, shift(view, 1)] : [view];
    if (!months.some(v => date.slice(0, 7) === iso(v.y, v.m, 1).slice(0, 7))) setView(variant === 'dual' && date > iso(view.y, view.m, 1) ? shift(ym(date), -1) : ym(date));
  };
  const isDisabled = (date: string) => (maxDate ? date > maxDate : false);
  const complete = draft.from && draft.to ? { from: draft.from, to: draft.to } : null;
  const apply = (r: DateRange | null) => {
    setOpen(false);
    onApply(r);
  };
  const days = complete ? daysBetween(complete.from, complete.to) + 1 : 0;
  const activePreset = presets.find(p => complete && p.range.from === complete.from && p.range.to === complete.to)?.key;

  const grid = (v: Month, hidePrev?: boolean, hideNext?: boolean) => (
    <div className="w-full sm:w-[280px]">
      <MonthHeader view={v} onPrev={() => { setView(x => shift(x, -1)); }} onNext={() => { setView(x => shift(x, 1)); }} hidePrev={hidePrev} hideNext={hideNext} />
      <MonthGrid view={v} today={today} selected={draft} isDisabled={isDisabled} onPick={pick} focus={focus} onFocusDate={focusDate} heat={heat} label={`${MONTHS[v.m] ?? ''} ${String(v.y + 543)}`} />
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <p className="text-sm text-muted" aria-live="polite">{complete ? <><b className="text-ink">{thaiRange(complete)}</b> · {days} วัน</> : draft.from ? `${thaiDate(draft.from)} · เลือกวันสุดท้าย` : 'เลือกวันแรก'}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { apply(null); }} className={btn.ghost}>ล้าง</button>
        <button type="button" disabled={!complete} onClick={() => { if (complete) apply(complete); }} className={btn.primary}>ใช้ช่วงนี้</button>
      </div>
    </div>
  );

  const presetButtons = (vertical: boolean) => (
    <div className={vertical ? 'scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:w-44 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-r sm:border-line sm:bg-bg/40 sm:px-2.5 sm:py-3.5' : 'scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1'}>
      {vertical && <p className="hidden px-2.5 pb-1.5 text-[11px] font-semibold tracking-[.12em] text-faint sm:block">ช่วงด่วน</p>}
      {presets.map(p => (
        <button
          key={p.key}
          type="button"
          aria-pressed={activePreset === p.key}
          onClick={() => { setDraft(p.range); setView(variant === 'dual' ? shift(ym(p.range.to), -1) : ym(p.range.to)); }}
          className={vertical
            ? 'min-h-10 shrink-0 rounded-full border border-line px-3 text-sm text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-accent sm:rounded-[10px] sm:border-0 sm:text-left sm:aria-pressed:bg-accent/12 sm:aria-pressed:font-semibold'
            : 'min-h-9 shrink-0 rounded-full border border-line px-3 text-[13px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-accent'}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <TriggerButton open={open} onClick={openPicker} id={dialogId}>
        {value ? <>{thaiRange(value)} <span className="font-normal text-muted">· {daysBetween(value.from, value.to) + 1} วัน</span></> : <span className="font-normal text-muted">ทุกช่วงเวลา — แตะเพื่อเลือก</span>}
      </TriggerButton>
      <Popover open={open} onClose={() => { setOpen(false); }} label={label}>
        {variant === 'dual' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-0">
            {presetButtons(true)}
            <div className="flex flex-col gap-3 sm:p-4">
              {/* มือถือแสดงเฉพาะเดือนขวา (เดือนล่าสุด) */}
              <div className="flex gap-6">
                <div className="hidden sm:block">{grid(view, false, true)}</div>
                {grid(shift(view, 1), true, false)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex min-h-10 flex-1 flex-col justify-center rounded-[10px] border border-line bg-bg px-3"><small className="text-[10.5px] leading-tight text-faint">ตั้งแต่</small><b className="leading-tight font-semibold">{draft.from ? thaiDate(draft.from) : '—'}</b></span>
                <MoveRight aria-hidden className="size-4 shrink-0 text-faint" />
                <span className={`flex min-h-10 flex-1 flex-col justify-center rounded-[10px] border bg-bg px-3 ${draft.from && !draft.to ? 'border-accent' : 'border-line'}`}><small className="text-[10.5px] leading-tight text-faint">ถึง</small><b className="leading-tight font-semibold">{draft.to ? thaiDate(draft.to) : 'เลือกวันสุดท้าย'}</b></span>
              </div>
              {footer}
            </div>
          </div>
        )}
        {variant === 'compact' && (
          <div className="flex flex-col gap-3 sm:w-[320px] sm:p-4">
            {presetButtons(false)}
            {grid(view)}
            {footer}
          </div>
        )}
        {variant === 'heatmap' && (
          <div className="flex flex-col gap-3 sm:w-[336px] sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">รวมในช่วงที่เลือก</p>
                <p className="text-xl font-semibold">{complete && heatTotal ? heatTotal(complete) : '—'}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-faint">น้อย<i className="size-3 rounded bg-accent/10" /><i className="size-3 rounded bg-accent/20" /><i className="size-3 rounded bg-accent/35" />มาก</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }, (_, k) => shift(ym(maxDate ?? today), k - 5)).map(v => (
                <button key={`${String(v.y)}-${String(v.m)}`} type="button" aria-pressed={v.y === view.y && v.m === view.m} onClick={() => { setView(v); }} className="min-h-9 rounded-lg border border-transparent text-xs text-muted hover:bg-surface-2 aria-pressed:border-accent aria-pressed:text-accent">{SHORT[v.m]}</button>
              ))}
            </div>
            {presetButtons(false)}
            {grid(view)}
            {footer}
          </div>
        )}
      </Popover>
    </div>
  );
}

/* ---------- เลือกวันเดียว (แบบ B) สำหรับฟอร์ม ---------- */

export function DatePickerField({ name, label, defaultValue, min, max, today, error, optional, placeholder = 'เลือกวันที่', onChange }: {
  name: string;
  onChange?: (value: string) => void;
  label: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  today: string;
  error?: string;
  optional?: boolean;
  placeholder?: string;
}) {
  const [value, setStored] = useState(defaultValue ?? '');
  const setValue = (v: string) => {
    setStored(v);
    onChange?.(v);
  };
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Month>(ym(value || today));
  const [focus, setFocus] = useState(value || today);
  const id = useId();
  const isDisabled = (date: string) => (min !== undefined && date < min) || (max !== undefined && date > max);
  const focusDate = (date: string) => {
    setFocus(date);
    if (date.slice(0, 7) !== iso(view.y, view.m, 1).slice(0, 7)) setView(ym(date));
  };
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label} {optional && <span className="font-normal text-faint">(ไม่บังคับ)</span>}</label>
      <TriggerButton id={id} open={open} invalid={Boolean(error)} describedBy={error ? `${id}-error` : undefined} onClick={() => { setDraft(value); setView(ym(value || today)); setOpen(o => !o); }}>
        {value ? thaiDate(value) : <span className="font-normal text-faint">{placeholder}</span>}
      </TriggerButton>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onClose={() => { setOpen(false); }} align="start" label={label}>
        <div className="flex flex-col gap-3 sm:w-[310px] sm:p-4">
          <p className="text-[15px] font-semibold sm:hidden">{label}</p>
          <MonthHeader view={view} onPrev={() => { setView(v => shift(v, -1)); }} onNext={() => { setView(v => shift(v, 1)); }} />
          <MonthGrid view={view} today={today} selected={{ from: draft || null, to: draft || null }} isDisabled={isDisabled} onPick={d => { setDraft(d); setFocus(d); }} focus={focus} onFocusDate={focusDate} label={label} />
          <div className="flex gap-2 border-t border-line pt-3">
            {optional && <button type="button" onClick={() => { setValue(''); setOpen(false); }} className={btn.ghost}>ล้าง</button>}
            <button type="button" disabled={!draft} onClick={() => { setValue(draft); setOpen(false); }} className={`${btn.primary} flex-1`}>{draft ? `เลือก ${thaiDate(draft)}` : 'เลือกวันที่'}</button>
          </div>
        </div>
      </Popover>
      {error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
