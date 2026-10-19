import { devices, expect, type Page, type PlaywrightTestConfig } from '@playwright/test';

/** §15.2.7 หน้าเว็บต้องไม่มี scroll แนวนอน */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'หน้าเว็บมี scroll แนวนอน').toBeLessThanOrEqual(0);
}

/**
 * Playwright config กลาง: รัน 3 ขนาดจอ (mobile / tablet / desktop) ตาม §15.2.7
 * ใช้ Google Chrome ที่ติดตั้งในเครื่อง (channel: 'chrome') ไม่ต้องดาวน์โหลด browser เพิ่ม
 */
export function playwrightConfig(port: number): PlaywrightTestConfig {
  const baseURL = `http://localhost:${port}`;
  return {
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
      command: 'pnpm start', // พอร์ตกำหนดไว้ใน script start ของแต่ละ app
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  };
}
