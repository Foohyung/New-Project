import type { NextConfig } from 'next';
import { securityHeaders } from './src/api/lib/security/security/security';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // build แล้วได้ server.js ที่รันด้วย node ได้ทันที (.next/standalone) — ดู README หัวข้อ Deploy
  output: 'standalone',
  // Server Action รับ body ได้ 1 MB โดยค่าเริ่มต้น — ขยายให้อัปโหลดโลโก้ได้ถึง 5 MB (+ ฟิลด์อื่นในฟอร์ม)
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  headers() {
    // camera=(self) สำหรับสแกน QR ที่เคาน์เตอร์ (§10.5)
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders({ permissions: { camera: 'self' } }) }]);
  },
};

export default config;
