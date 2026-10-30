import type { ReactNode } from 'react';
import type { Theme } from '@/api/services/theme/theme/theme.themes';
import { DemoBar } from '@/web/components/layout/layout/layout.demo-bar';
import { ThemeSwitcher } from '@/web/components/layout/layout/layout.theme-switcher';
import { BottomNav, Sidebar, type ShellUser } from '@/web/components/layout/layout/layout.nav';

export function AppShell({ user, demo, theme, branding, children }: { user: ShellUser; demo: { logoutAction: () => Promise<void> }; theme: { theme: Theme; setTheme: (theme: string) => Promise<void> }; branding: { gymName: string | null; logoSrc: string | null }; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)] print:block">
      <div className="print:hidden"><Sidebar user={user} logoutAction={demo.logoutAction} logoSrc={branding.logoSrc} gymName={branding.gymName} /></div>
      {/* overflow-x-clip: สปริงตอนเนื้อหาพุ่งเข้าเลยตำแหน่งไปทางขวานิดหน่อย ไม่ให้เกิด scroll แนวนอนชั่วขณะ (clip ไม่สร้าง scroll container จึงไม่กระทบ sticky) */}
      <main className="flex min-w-0 flex-col gap-5 overflow-x-clip px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 md:pb-10 lg:gap-6 lg:px-8 lg:pt-6 print:p-0">
        <DemoBar user={user} {...demo}>
          <ThemeSwitcher {...theme} />
        </DemoBar>
        {children}
      </main>
      <BottomNav role={user.role} permissions={user.permissions} />
    </div>
  );
}
