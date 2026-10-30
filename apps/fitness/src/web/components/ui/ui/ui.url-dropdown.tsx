'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { Dropdown, type DropdownOption } from '@/web/components/ui/ui/ui.dropdown';

/** Dropdown ที่เปลี่ยน URL (ตัวกรอง/การเรียง) — ค่าอยู่ใน query string จึงแชร์ลิงก์ได้ */
export function UrlDropdown({ options, value, label, align = 'start' }: { options: (DropdownOption & { href: string })[]; value: string; label: string; align?: 'start' | 'end' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <div aria-busy={pending} className={pending ? 'opacity-60 transition-opacity' : ''}>
      <Dropdown
        label={label}
        inline
        variant="toolbar"
        align={align}
        value={shown}
        options={options}
        onChange={next => {
          const href = options.find(o => o.value === next)?.href;
          if (!href) return;
          startTransition(() => {
            setShown(next);
            router.push(href, { scroll: false });
          });
        }}
      />
    </div>
  );
}
