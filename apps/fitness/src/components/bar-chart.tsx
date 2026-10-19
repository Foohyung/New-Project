import type { ReactNode } from 'react';

/**
 * กราฟแท่งแบบเรียบง่าย — แท่งเป็นภาพประกอบ (aria-hidden) และมีตัวเลขสรุปเป็นข้อความเสมอ
 * บนมือถือแสดง label เว้นตัวเพื่อไม่ให้ชนกัน (§15.2.4)
 */
export function BarChart({ data, format, highlight, summary }: { data: { label: string; value: number }[]; format: (v: number) => string; highlight?: string; summary: ReactNode }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <figure className="flex flex-col gap-2">
      <div aria-hidden className="flex h-44 items-end gap-[2px] border-b border-dashed border-line sm:gap-1">
        {data.map(d => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end">
            <span
              title={`${d.label}: ${format(d.value)}`}
              style={{ height: `${String(Math.max(2, (d.value / max) * 100))}%` }}
              className={`w-full max-w-6 rounded-t ${d.label === highlight ? 'bg-lime' : 'bg-gradient-to-b from-[#3b4350] to-[#262c35]'}`}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-[2px] sm:gap-1">
        {data.map((d, i) => (
          <span key={d.label} className={`flex-1 truncate text-center text-[10px] ${d.label === highlight ? 'font-semibold text-lime' : 'text-faint'} ${i % 5 === 0 || d.label === highlight ? '' : 'invisible md:visible'} ${i % 2 ? 'md:invisible lg:visible' : ''}`}>
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="text-sm text-muted">{summary}</figcaption>
    </figure>
  );
}
