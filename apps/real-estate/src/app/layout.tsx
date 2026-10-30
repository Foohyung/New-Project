import type { Metadata, Viewport } from 'next';
import { Anuphan, Noto_Sans_Thai } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { currentTheme } from '@/server/agent/theme';
import { siteUrl } from '@/server/site';
import './globals.css';

// หน้าสาธารณะใช้แบบ 5E Portal Mix (ฟอนต์ Noto Sans Thai แบบเดียวกับพอร์ทัลประกาศยอดนิยม)
const noto = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-noto-thai', display: 'swap' });
// หลังบ้าน agent ใช้แบบ 2 Marketplace (ฟอนต์ Anuphan)
const anuphan = Anuphan({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-anuphan', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'BaanHub — ประกาศซื้อ ขาย เช่า บ้าน คอนโด ที่ดิน ลงประกาศฟรี', template: '%s · BaanHub' },
  description: 'ค้นหาบ้าน คอนโด ที่ดิน ใกล้รถไฟฟ้า ทั่วไทย จากเจ้าของและ agent ที่ตรวจสอบแล้ว เทียบราคาต่อ ตร.ม. และคำนวณค่าผ่อนได้ในที่เดียว',
  openGraph: { siteName: 'BaanHub', locale: 'th_TH', type: 'website' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0e2a57' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // render ทุก request เพื่อให้ CSP nonce ใช้ได้ (§10.5)
  await connection();
  // ธีมของหลังบ้านอยู่ใน cookie แล้ว render ฝั่ง server เพื่อไม่ให้จอกะพริบ (§15.3) — หน้าสาธารณะใช้ธีมสว่างเสมอ
  const theme = await currentTheme();
  return (
    <html lang="th" data-theme={theme} className={`${noto.variable} ${anuphan.variable}`}>
      <body>{children}</body>
    </html>
  );
}
