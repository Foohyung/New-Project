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
    // camera=(self) สำหรับสแกน QR ที่เคาน์เตอร์ (§10.5)
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders({ permissions: { camera: 'self' } }) }]);
  },
};

export default config;
