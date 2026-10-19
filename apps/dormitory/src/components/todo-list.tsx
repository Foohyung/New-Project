'use client';

import { useState } from 'react';

interface Todo {
  id: string;
  title: string;
  note: string;
  done: boolean;
}

/** ระยะที่ 1 เก็บสถานะในหน้าเว็บ — ระยะที่ 2 บันทึกผ่าน Server Action */
export function TodoList({ items }: { items: Todo[] }) {
  const [done, setDone] = useState(() => new Set(items.filter(t => t.done).map(t => t.id)));
  return (
    <ul className="divide-y divide-dashed divide-line">
      {items.map(t => {
        const checked = done.has(t.id);
        return (
          <li key={t.id}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  setDone(prev => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  });
                }}
                className="mt-0.5 size-6 shrink-0 accent-green"
              />
              <span className={checked ? 'text-muted line-through' : ''}>
                {t.title}
                <small className="block text-xs text-muted no-underline">{t.note}</small>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
