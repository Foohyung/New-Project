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
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders() }]);
  },
};

export default config;
