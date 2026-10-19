import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Kanit } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { resetDemoAction, switchRoleAction } from '@/features/demo/actions';
import { requireSession } from '@/server/auth';
import { can } from '@/server/rbac';
import './globals.css';

const plex = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex', display: 'swap' });
const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['500', '600', '700'], variable: '--font-kanit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FitFlow', template: '%s · FitFlow' },
  description: 'ระบบจัดการฟิตเนส: สมาชิก เช็กอิน คลาส เทรนเนอร์ การเงิน และรายงาน',
  robots: { index: false, follow: false }, // หลังบ้านห้าม index (§16)
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0d10' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // render ทุก request เพื่อให้ CSP nonce ใช้ได้ (§10.5)
  await connection();
  const session = await requireSession();
  return (
    <html lang="th" className={`${plex.variable} ${kanit.variable}`}>
      <body>
        <AppShell
          user={{ name: session.name, nickname: session.nickname, branch: session.branch, role: session.role }}
          demo={{ canReset: can(session, 'demo.reset'), switchAction: switchRoleAction, resetAction: resetDemoAction }}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
