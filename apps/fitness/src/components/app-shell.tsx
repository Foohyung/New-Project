import type { ReactNode } from 'react';
import type { Theme } from '@/features/theme/themes';
import { DemoBar } from './demo-bar';
import { ThemeSwitcher } from './theme-switcher';
import { BottomNav, Sidebar, type ShellUser } from './nav';

export function AppShell({ user, demo, theme, children }: { user: ShellUser; demo: { canReset: boolean; switchAction: (formData: FormData) => Promise<void>; resetAction: () => Promise<void> }; theme: { theme: Theme; setTheme: (theme: string) => Promise<void> }; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[264px_minmax(0,1fr)] print:block">
      <div className="print:hidden"><Sidebar user={user} /></div>
      <main className="flex min-w-0 flex-col gap-5 px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 md:pb-10 lg:gap-6 lg:px-8 lg:pt-6 print:p-0">
        <DemoBar role={user.role} {...demo}>
          <ThemeSwitcher {...theme} />
        </DemoBar>
        {children}
      </main>
      <BottomNav role={user.role} />
    </div>
  );
}
