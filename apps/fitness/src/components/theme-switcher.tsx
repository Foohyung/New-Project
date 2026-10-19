'use client';

import { useOptimistic, useTransition } from 'react';
import { THEME_INFO, THEMES, type Theme } from '@/features/theme/themes';
import { Dropdown } from './dropdown';

function Swatch({ theme }: { theme: Theme }) {
  const { bg, accent } = THEME_INFO[theme];
  return (
    <span className="relative size-5 overflow-hidden rounded-full border border-line" style={{ backgroundColor: bg }}>
      <span className="absolute inset-y-0 right-0 w-1/2" style={{ backgroundColor: accent }} />
    </span>
  );
}

/** เปลี่ยนธีมทันทีบนหน้าจอ แล้วบันทึกลง cookie ให้หน้าถัดไปใช้ธีมเดิม */
export function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (theme: string) => Promise<void> }) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(theme);
  const apply = (next: string) => {
    const info = THEME_INFO[next as Theme];
    const root = document.documentElement;
    root.dataset.theme = next;
    root.style.colorScheme = info.scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', info.bg);
    startTransition(async () => {
      setShown(next as Theme);
      await setTheme(next);
    });
  };
  return (
    <Dropdown
      label="ธีม"
      inline
      variant="toolbar"
      align="end"
      value={shown}
      onChange={apply}
      options={THEMES.map(t => ({ value: t, label: THEME_INFO[t].label, description: THEME_INFO[t].description, icon: <Swatch theme={t} /> }))}
    />
  );
}
