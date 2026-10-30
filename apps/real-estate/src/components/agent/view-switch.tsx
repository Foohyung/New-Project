import Link from 'next/link';
import type { ReactNode } from 'react';

export type Params = Record<string, string | undefined>;

/** สร้าง URL โดยคง query เดิมไว้ แล้วแทนค่าเฉพาะที่ส่งมา (ค่า undefined = ลบออก) */
export function hrefWith(path: string, current: Params, patch: Params): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** ปุ่มสลับมุมมองแบบ segmented — เก็บมุมมองไว้ใน URL (?view=) จึงแชร์ลิงก์/กดย้อนกลับได้ */
export function ViewSwitch({ views, current, hrefFor }: { views: { value: string; label: string; icon: ReactNode }[]; current: string; hrefFor: (view: string) => string }) {
  return (
    <nav aria-label="มุมมอง" className="inline-flex shrink-0 rounded-xl border border-line bg-surface p-1">
      {views.map(v => (
        <Link
          key={v.value}
          href={hrefFor(v.value)}
          scroll={false}
          aria-current={v.value === current ? 'page' : undefined}
          title={v.label}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-muted hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-accent sm:px-3"
        >
          <span aria-hidden className="flex">{v.icon}</span>
          <span className="sr-only sm:not-sr-only">{v.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** แถวเครื่องมือเหนือข้อมูล: มุมมองซ้าย ตัวกรอง/เรียงขวา */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 sm:gap-3">{children}</div>;
}
