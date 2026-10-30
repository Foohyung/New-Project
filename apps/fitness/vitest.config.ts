import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // ให้ test เรียก DAL ได้โดยตรง (ใน Next.js แพ็กเกจนี้กันโค้ด server หลุดไปฝั่ง client)
      'server-only': path.resolve(import.meta.dirname, 'src/api/test/setup/setup/setup.server-only.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // test ของ DAL รันกับ MySQL ที่ TEST_DATABASE_URL (ไม่ตั้ง = ข้าม) · ตรึงเวลาให้ตรงกับข้อมูลตัวอย่าง
    env: { TZ: 'UTC', DEMO_CLOCK: 'on', DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
    // ทุกไฟล์ใช้ฐานข้อมูลทดสอบเดียวกัน จึงรันทีละไฟล์
    fileParallelism: false,
  },
});
