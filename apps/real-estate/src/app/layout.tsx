import type { Metadata, Viewport } from 'next';
import { Pridi, Sarabun } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { siteUrl } from '@/server/site';
import './globals.css';

const sarabun = Sarabun({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-sarabun', display: 'swap' });
const pridi = Pridi({ subsets: ['thai', 'latin'], weight: ['500', '600'], variable: '--font-pridi', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'BaanHub — หาบ้านจากไลฟ์สไตล์', template: '%s · BaanHub' },
  description: 'ค้นหาบ้าน คอนโด และที่ดินที่เข้ากับชีวิตของคุณ ดูคะแนนย่านน่าอยู่ และคำนวณค่าผ่อนได้ในที่เดียว',
  openGraph: { siteName: 'BaanHub', locale: 'th_TH', type: 'website' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c65d3b' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // render ทุก request เพื่อให้ CSP nonce ใช้ได้ (§10.5)
  await connection();
  return (
    <html lang="th" className={`${sarabun.variable} ${pridi.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <footer className="mx-auto max-w-6xl px-4 pt-6 pb-10 text-sm text-muted sm:px-7">
          <p className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
            <span>© 2026 BaanHub · ข้อมูลประกาศและคะแนนย่านในเว็บนี้เป็นข้อมูลตัวอย่าง</span>
            <span>นโยบายความเป็นส่วนตัว · ข้อกำหนดการใช้งาน</span>
          </p>
        </footer>
      </body>
    </html>
  );
}
