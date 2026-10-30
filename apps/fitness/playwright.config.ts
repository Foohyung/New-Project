import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3001';

/**
 * รัน 3 ขนาดจอ (mobile / tablet / desktop) ตาม §15.2.7
 * ใช้ Google Chrome ที่ติดตั้งในเครื่อง (channel: 'chrome') ไม่ต้องดาวน์โหลด browser เพิ่ม
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // จำกัดจำนวน browser ที่เปิดพร้อมกัน — เปิดมากเกินไปทำให้สร้าง context ไม่ทันจน timeout
  workers: process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // CI เก็บรายงาน HTML ไว้เป็น artifact เมื่อ test พัง
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', locale: 'th-TH', timezoneId: 'Asia/Bangkok' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, channel: 'chrome' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel: 'chrome' } },
  ],
  webServer: {
    command: 'pnpm start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
