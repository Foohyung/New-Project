import type { Metadata, Viewport } from 'next';
import { Mitr, Noto_Sans_Thai_Looped } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { BottomNav, Header } from '@/components/nav';
import { requireSession } from '@/server/auth';
import './globals.css';

const looped = Noto_Sans_Thai_Looped({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-looped', display: 'swap' });
const mitr = Mitr({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-mitr', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DormDee', template: '%s · DormDee' },
  description: 'ระบบจัดการหอพัก: ผังห้อง บิลรายเดือน และการรับชำระ',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f9d6b' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await requireSession();
  return (
    <html lang="th" className={`${looped.variable} ${mitr.variable}`}>
      <body>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Header building={session.building} nickname={session.nickname} />
          <main className="flex flex-col gap-5 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
