import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BottomNav, LogoutButton, Sidebar } from '@/components/agent/nav';
import { ThemeToggle } from '@/components/agent/theme-toggle';
import { logoutAction } from '@/features/auth/actions';
import { setThemeAction } from '@/features/theme/actions';
import { THEME_INFO } from '@/features/theme/themes';
import { requireSession } from '@/server/agent/auth';
import { currentTheme } from '@/server/agent/theme';

export const metadata: Metadata = { title: { default: 'หลังบ้าน Agent', template: '%s · BaanHub Agent' }, robots: { index: false, follow: false } };

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: THEME_INFO[await currentTheme()].bg };
}

/** โครงหลังบ้าน agent (แบบ 2 Marketplace): sidebar แบ่งโซน (≥ md) · แถบล่าง (มือถือ) */
export default async function AgentLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const theme = await currentTheme();
  const user = { name: session.name, initials: session.initials, role: session.role };
  return (
    <div className="agent min-h-dvh md:grid md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[256px_minmax(0,1fr)] print:block">
      <div className="print:hidden"><Sidebar user={user} logoutAction={logoutAction} /></div>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur md:px-6 lg:px-8 print:hidden">
          <span className="flex items-center gap-2 text-lg font-bold text-accent md:hidden">
            <span aria-hidden className="grid size-8 place-items-center rounded-[9px] bg-accent text-sm text-on-accent">⌂</span>BaanHub
          </span>
          <span className="ml-auto" />
          <a href="/" className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-muted hover:text-ink sm:inline-flex">ดูหน้าเว็บ ↗</a>
          <ThemeToggle theme={theme} setTheme={setThemeAction} />
          <span className="md:hidden"><LogoutButton logoutAction={logoutAction} /></span>
        </header>
        <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 md:pb-10 lg:gap-6 lg:px-8 lg:pt-7 print:p-0">
          {children}
        </main>
      </div>
      <BottomNav role={session.role} />
    </div>
  );
}
