'use client';

import { Moon, Sun } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';
import { THEME_INFO, type Theme } from '@/features/theme/themes';

/** สลับธีมสว่าง/มืดทันทีบนหน้าจอ แล้วบันทึกลง cookie ให้หน้าถัดไปใช้ธีมเดิม (§15.3) */
export function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (theme: string) => Promise<void> }) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(theme);
  const next: Theme = shown === 'dark' ? 'light' : 'dark';
  const apply = () => {
    const root = document.documentElement;
    root.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_INFO[next].bg);
    startTransition(async () => {
      setShown(next);
      await setTheme(next);
    });
  };
  return (
    <button type="button" onClick={apply} aria-label={`เปลี่ยนเป็นธีม${THEME_INFO[next].label}`} title={`ธีม${THEME_INFO[next].label}`} className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-ink">
      {shown === 'dark' ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  );
}
