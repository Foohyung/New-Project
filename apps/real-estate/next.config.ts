import path from 'node:path';
import type { NextConfig } from 'next';
import { securityHeaders } from '@repo/security';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@repo/utils'],
  headers() {
    // geolocation=(self) สำหรับค้นหาใกล้ฉัน (§10.5)
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders({ permissions: { geolocation: 'self' } }) }]);
  },
};

export default config;
