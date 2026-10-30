import { formatBaht } from '@repo/utils';
import type { MonthSummary } from '@/features/ledger/service';

const SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** "2026-10" → "ต.ค. 69" */
export const monthLabel = (ym: string) => `${SHORT[Number(ym.slice(5, 7)) - 1] ?? ''} ${String((Number(ym.slice(0, 4)) + 543) % 100).padStart(2, '0')}`;

const SERIES = [
  { key: 'income', label: 'รายรับรวม', cls: 'bg-ok' },
  { key: 'commission', label: 'ค่าคอม', cls: 'bg-accent' },
  { key: 'expense', label: 'รายจ่าย', cls: 'bg-warn' },
] as const;

/**
 * กราฟแท่งรายเดือน (รายรับ / ค่าคอม / รายจ่าย) — แท่งเป็นภาพประกอบ ตัวเลขจริงอยู่ในตารางสรุปที่ screen reader อ่านได้
 * มากกว่า 6 เดือนให้เลื่อนในกล่องบนมือถือ (§15.2.4)
 */
export function MonthChart({ data }: { data: MonthSummary[] }) {
  const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div aria-hidden className="flex h-44 items-end gap-2 border-b border-dashed border-line" style={{ minWidth: `${String(data.length * 44)}px` }}>
          {data.map(d => (
            <div key={d.month} className="flex h-full flex-1 items-end justify-center gap-[3px]">
              {SERIES.map(s => (
                <span key={s.key} title={`${monthLabel(d.month)} ${s.label} ${formatBaht(d[s.key])}`} style={{ height: `${String(Math.max(d[s.key] ? 3 : 0, (d[s.key] / max) * 100))}%` }} className={`w-full max-w-4 rounded-t ${s.cls}`} />
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1 flex gap-2" style={{ minWidth: `${String(data.length * 44)}px` }}>
          {data.map(d => <span key={d.month} className="flex-1 text-center text-xs text-faint">{monthLabel(d.month)}</span>)}
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {SERIES.map(s => <span key={s.key} className="inline-flex items-center gap-1.5"><i aria-hidden className={`size-2.5 rounded-sm ${s.cls}`} />{s.label}</span>)}
      </figcaption>
      <table className="sr-only">
        <caption>สรุปรายเดือน</caption>
        <thead><tr><th>เดือน</th>{SERIES.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{data.map(d => <tr key={d.month}><td>{monthLabel(d.month)}</td>{SERIES.map(s => <td key={s.key}>{formatBaht(d[s.key])}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}
