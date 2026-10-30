import { expect, type Page } from '@playwright/test';

/** §15.2.7 หน้าเว็บต้องไม่มี scroll แนวนอน */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'หน้าเว็บมี scroll แนวนอน').toBeLessThanOrEqual(0);
}
