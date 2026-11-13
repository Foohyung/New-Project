import type { Metadata, Viewport } from 'next';
import { Suspense, type CSSProperties } from 'react';
import { IBM_Plex_Sans_Thai, Kanit } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/web/components/layout/layout/layout.app-shell';
import { PageTransition } from '@/web/components/layout/layout/layout.page-transition';
import { FaviconSync } from '@/web/components/layout/layout/layout.favicon';
import { DeletedFlash, Toaster } from '@/web/components/ui/ui/ui.toast';
import { logoutAction } from '@/api/actions/auth/auth/auth.actions';
import { setThemeAction, setThemeModeAction } from '@/api/actions/theme/theme/theme.actions';
import { THEME_MODE_INFO, themeBackground } from '@/api/services/theme/theme/theme.themes';
import { getSession } from '@/api/lib/auth/auth/auth.session';
import { currentTheme, currentThemeMode } from '@/api/lib/theme/theme/theme.server';
import { getBranchBranding } from '@/api/dal/branding/branding/branding.dal';
import './globals.css';

const plex = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex', display: 'swap' });
const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['500', '600', '700'], variable: '--font-kanit', display: 'swap' });
/* ตัวหนาเอียงสายกีฬา (แถบเปลี่ยนหน้า/แถบข้อความวิ่ง) — อักษรละตินอย่างเดียว */
const athletic = Kanit({ subsets: ['latin'], weight: '800', style: 'italic', variable: '--font-kanit-athletic', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FitFlow', template: '%s · FitFlow' },
  description: 'ระบบจัดการฟิตเนส: สมาชิก เช็กอิน คลาส เทรนเนอร์ การเงิน และรายงาน',
  robots: { index: false, follow: false }, // หลังบ้านห้าม index (§16)
};

export async function generateViewport(): Promise<Viewport> {
  const [theme, mode] = await Promise.all([currentTheme(), currentThemeMode()]);
  return { width: 'device-width', initialScale: 1, themeColor: themeBackground(theme, mode) };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // render ทุก request เพื่อให้ CSP nonce ใช้ได้ (§10.5)
  await connection();
  const [session, theme, mode] = await Promise.all([getSession(), currentTheme(), currentThemeMode()]);
  const branding = session && !session.mustChangePassword ? await getBranchBranding(session) : null;
  const rootStyle: CSSProperties & { '--color-lime'?: string } = {
    colorScheme: THEME_MODE_INFO[mode].scheme,
    ...(branding?.primaryColor ? { '--color-lime': branding.primaryColor } : {}),
  };
  const logoSrc = branding?.hasUploadedLogo ? '/api/branding/logo' : branding?.logoUrl ?? null;
  const gymName = branding?.gymName ?? null;
  return (
    <html lang="th" data-theme={theme} data-mode={mode} style={rootStyle} className={`${plex.variable} ${kanit.variable} ${athletic.variable}`}>
      <body>
        <FaviconSync />
        <PageTransition />
        <Toaster />
        <Suspense fallback={null}><DeletedFlash /></Suspense>
        {session && !session.mustChangePassword ? (
          <AppShell
            user={{ name: session.name, nickname: session.nickname, branch: session.branch, role: session.role, roleName: session.roleName ?? session.role, permissions: session.permissions ?? [] }}
            demo={{ logoutAction }}
            theme={{ theme, mode, setTheme: setThemeAction, setMode: setThemeModeAction }}
            branding={{ gymName, logoSrc }}
          >
            {children}
          </AppShell>
        ) : (
          // ยังไม่ได้เข้าสู่ระบบ: แสดงเฉพาะหน้า login (proxy พาหน้าอื่นมาที่นี่แล้ว)
          children
        )}
      </body>
    </html>
  );
}
