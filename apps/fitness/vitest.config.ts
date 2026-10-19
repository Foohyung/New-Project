import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // ให้ test เรียก DAL ได้โดยตรง (ใน Next.js แพ็กเกจนี้กันโค้ด server หลุดไปฝั่ง client)
      'server-only': path.resolve(import.meta.dirname, 'src/test/empty.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { TZ: 'UTC' },
  },
});
