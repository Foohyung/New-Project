'use client';

import { Moon, Sun } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';
import { THEME_INFO, THEME_MODE_INFO, THEMES, type Theme, type ThemeMode } from '@/api/services/theme/theme/theme.themes';
import { Dropdown } from '@/web/components/ui/ui/ui.dropdown';

function Swatch({ theme }: { theme: Theme }) {
  const { bg, accent } = THEME_INFO[theme];
  return (
    <span className="relative size-5 overflow-hidden rounded-full border border-line" style={{ backgroundColor: bg }}>
      <span className="absolute inset-y-0 right-0 w-1/2" style={{ backgroundColor: accent }} />
    </span>
  );
}

/** เปลี่ยนพาเลตต์และโหมดสีทันที แล้วบันทึกลง cookie ให้หน้าถัดไปใช้ค่าเดิม */
export function ThemeSwitcher({ theme, mode, setTheme, setMode }: { theme: Theme; mode: ThemeMode; setTheme: (theme: string) => Promise<void>; setMode: (mode: string) => Promise<void> }) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(theme);
  const [shownMode, setShownMode] = useOptimistic(mode);
  const updateThemeColor = () => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  };
  const applyTheme = (next: string) => {
    const root = document.documentElement;
    root.dataset.theme = next;
    updateThemeColor();
    startTransition(async () => {
      setShown(next as Theme);
      await setTheme(next);
    });
  };
  const applyMode = (next: ThemeMode) => {
    const root = document.documentElement;
    root.dataset.mode = next;
    root.style.colorScheme = THEME_MODE_INFO[next].scheme;
    updateThemeColor();
    startTransition(async () => {
      setShownMode(next);
      await setMode(next);
    });
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Dropdown
        label="ธีม"
        inline
        variant="toolbar"
        align="end"
        value={shown}
        onChange={applyTheme}
        options={THEMES.map(t => ({ value: t, label: THEME_INFO[t].label, description: THEME_INFO[t].description, icon: <Swatch theme={t} /> }))}
      />
      <button
        type="button"
        aria-label={`เปลี่ยนเป็นโหมด${THEME_MODE_INFO[shownMode === 'dark' ? 'light' : 'dark'].label}`}
        title={`เปลี่ยนเป็นโหมด${THEME_MODE_INFO[shownMode === 'dark' ? 'light' : 'dark'].label}`}
        onClick={() => {
          applyMode(shownMode === 'dark' ? 'light' : 'dark');
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface-2 px-3 text-ink transition-colors hover:border-muted"
      >
        {shownMode === 'dark' ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
