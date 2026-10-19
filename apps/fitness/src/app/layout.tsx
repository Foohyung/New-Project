import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Kanit } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { logoutAction } from '@/features/auth/actions';
import { resetDemoAction } from '@/features/demo/actions';
import { setThemeAction } from '@/features/theme/actions';
import { THEME_INFO } from '@/features/theme/themes';
import { getSession } from '@/server/auth';
import { can } from '@/server/rbac';
import { currentTheme } from '@/server/theme';
import './globals.css';

const plex = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex', display: 'swap' });
const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['500', '600', '700'], variable: '--font-kanit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FitFlow', template: '%s · FitFlow' },
  description: 'ระบบจัดการฟิตเนส: สมาชิก เช็กอิน คลาส เทรนเนอร์ การเงิน และรายงาน',
  robots: { index: false, follow: false }, // หลังบ้านห้าม index (§16)
};

export async function generateViewport(): Promise<Viewport> {
  return { width: 'device-width', initialScale: 1, themeColor: THEME_INFO[await currentTheme()].bg };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // render ทุก request เพื่อให้ CSP nonce ใช้ได้ (§10.5)
  await connection();
  const [session, theme] = await Promise.all([getSession(), currentTheme()]);
  return (
    <html lang="th" data-theme={theme} style={{ colorScheme: THEME_INFO[theme].scheme }} className={`${plex.variable} ${kanit.variable}`}>
      <body>
        {session ? (
          <AppShell
            user={{ name: session.name, nickname: session.nickname, branch: session.branch, role: session.role }}
            demo={{ canReset: can(session, 'demo.reset'), resetAction: resetDemoAction, logoutAction }}
            theme={{ theme, setTheme: setThemeAction }}
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
