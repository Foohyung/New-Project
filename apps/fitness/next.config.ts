import type { NextConfig } from 'next';
import { securityHeaders } from './src/api/lib/security/security/security';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // build แล้วได้ server.js ที่รันด้วย node ได้ทันที (.next/standalone) — ดู README หัวข้อ Deploy
  output: 'standalone',
  // เผื่อ multipart overhead สำหรับไฟล์ QR สูงสุด 10 MB และโลโก้ 5 MB
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
  // URL เดิมก่อนปรับชื่อให้ตรงหน้า (docs/URL.md) — ลิงก์ที่บันทึกไว้หรือส่งไปแล้วยังเปิดได้ (308 คง query เดิม)
  redirects() {
    return Promise.resolve([
      { source: '/marketing/coupons', destination: '/coupons', permanent: true },
      { source: '/marketing', destination: '/reminders', permanent: true },
      { source: '/pos', destination: '/sales', permanent: true },
      { source: '/me/food', destination: '/me/nutrition', permanent: true },
      { source: '/me/workout', destination: '/me/workouts', permanent: true },
    ]);
  },
  headers() {
    // camera=(self) สำหรับสแกน QR ที่เคาน์เตอร์ (§10.5)
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders({ permissions: { camera: 'self' } }) }]);
  },
};

export default config;
