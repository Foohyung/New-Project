'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  /** บรรทัดรองใต้ชื่อ เช่น คำอธิบายสิทธิ์ หรือวันที่ที่จะได้ */
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

const VARIANT = {
  /** ช่องในฟอร์ม ขนาดเท่า inputClass */
  field: 'min-h-12 w-full rounded-xl border border-line bg-bg px-4',
  /** ปุ่มบนแถบเครื่องมือ (เรียง/กรอง/สลับบทบาท) */
  toolbar: 'min-h-11 rounded-xl border border-line bg-surface-2 px-3 font-semibold',
} as const;

/**
 * Dropdown เลือกค่าเดียว ตามแบบ "select-only combobox" ของ WAI-ARIA APG
 * - คีย์บอร์ด: ↑ ↓ Home End เลื่อน · Enter/Space เลือก · Esc ปิด · พิมพ์ตัวอักษรเพื่อกระโดดหา
 * - ใส่ `name` แล้วส่งค่าไปกับฟอร์มได้เหมือน <select> (hidden input)
 */
export function Dropdown({
  options, value, defaultValue, onChange, name, label, hideLabel = false, hint, error,
  variant = 'field', align = 'start', inline = false, className = '', id,
}: {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  label: string;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string;
  variant?: keyof typeof VARIANT;
  align?: 'start' | 'end';
  /** label อยู่ซ้ายของปุ่ม (ซ่อนบนจอเล็ก) แทนการอยู่ด้านบน */
  inline?: boolean;
  className?: string;
  id?: string;
}) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? '');
  const current = value ?? inner;
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === current));
  const selected = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: '', at: 0 });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${baseId}-opt-${String(active)}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, baseId]);

  const openList = (at = selectedIndex) => {
    setActive(at);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setInner(option.value);
    close();
    if (option.value !== current) onChange?.(option.value);
  };
  const step = (from: number, delta: 1 | -1) => {
    for (let i = from + delta; i >= 0 && i < options.length; i += delta) if (!options[i]?.disabled) return i;
    return from;
  };

  // โฟกัสอยู่ที่ปุ่มตลอด รายการที่ไฮไลต์บอกผ่าน aria-activedescendant (ตาม APG)
  const onKeyDown = (e: KeyboardEvent) => {
    const first = step(-1, 1);
    const last = step(options.length, -1);
    const keys: Record<string, () => void> = open
      ? {
          ArrowDown: () => { setActive(i => step(i, 1)); },
          ArrowUp: () => { setActive(i => step(i, -1)); },
          Home: () => { setActive(first); },
          End: () => { setActive(last); },
          Enter: () => { choose(active); },
          ' ': () => { choose(active); },
          Escape: close,
        }
      : {
          ArrowDown: () => { openList(); },
          ArrowUp: () => { openList(); },
          Enter: () => { openList(); },
          ' ': () => { openList(); },
          Home: () => { openList(first); },
          End: () => { openList(last); },
        };
    const handler = keys[e.key];
    if (handler) {
      e.preventDefault();
      handler();
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    // พิมพ์เพื่อกระโดดไปตัวเลือกที่ขึ้นต้นด้วยตัวอักษรนั้น
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
      const match = options.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (match >= 0) openList(match);
    }
  };

  const labelId = `${baseId}-label`;
  const buttonId = `${baseId}-button`;
  const listId = `${baseId}-list`;
  const describedBy = [hint ? `${baseId}-hint` : '', error ? `${baseId}-error` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div ref={rootRef} className={`flex min-w-0 ${inline ? 'flex-row items-center gap-2' : 'flex-col gap-1.5'} ${className}`}>
      <span id={labelId} className={hideLabel ? 'sr-only' : inline ? 'sr-only text-sm text-muted sm:not-sr-only' : 'text-sm font-semibold'}>{label}</span>
      <div className="relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? `${baseId}-opt-${String(active)}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onClick={() => {
            if (open) close();
            else openList();
          }}
          onKeyDown={onKeyDown}
          className={`${VARIANT[variant]} flex w-full items-center gap-2.5 text-left text-ink outline-none hover:border-muted focus-visible:border-accent aria-expanded:border-accent aria-[invalid=true]:border-danger`}
        >
          {selected?.icon && <span aria-hidden className="flex shrink-0 text-muted">{selected.icon}</span>}
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? 'เลือก'}</span>
          <ChevronDown aria-hidden className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {name && <input type="hidden" name={name} value={current} />}
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className={`absolute top-full z-50 mt-1.5 max-h-80 w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface-2 p-1.5 shadow-xl ${align === 'end' ? 'right-0' : 'left-0'}`}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={o.value}
                  id={`${baseId}-opt-${String(i)}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled ? true : undefined}
                  onMouseDown={e => {
                    e.preventDefault(); // ให้โฟกัสคงอยู่ที่ปุ่ม
                  }}
                  onPointerMove={() => {
                    if (!o.disabled) setActive(i);
                  }}
                  onClick={() => {
                    choose(i);
                  }}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === active ? 'bg-bg' : ''} ${o.disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                >
                  {o.icon && <span aria-hidden className={`flex shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}>{o.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className={`block ${isSelected ? 'font-semibold text-accent' : ''}`}>{o.label}</span>
                    {o.description && <span className="block text-xs leading-snug text-muted">{o.description}</span>}
                  </span>
                  <Check aria-hidden className={`size-4 shrink-0 text-accent ${isSelected ? '' : 'invisible'}`} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {hint && <p id={`${baseId}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${baseId}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
