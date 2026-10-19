import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from '@repo/testing';

test('หน้าหลักแสดงยอดเก็บเงินและผังห้อง', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('เก็บค่าเช่าได้แล้ว');
  await expect(page.getByRole('link', { name: /ห้อง 304/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('เปลี่ยนชั้นในผังห้อง', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'เลือกชั้น' }).getByRole('link', { name: 'ชั้น 2' }).click();
  await expect(page).toHaveURL(/floor=2/);
  await expect(page.getByRole('link', { name: /ห้อง 207/ })).toBeVisible();
});

test('บิลห้อง 304 คำนวณได้ ฿6,064.00 (A.2)', async ({ page }) => {
  await page.goto('/rooms/304');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ห้อง 304');
  await expect(page.getByRole('row', { name: /รวม/ })).toContainText('฿6,064.00');
  await expectNoHorizontalScroll(page);
});

test('ห้องที่ไม่มีอยู่แสดงหน้าไม่พบ', async ({ page }) => {
  const response = await page.goto('/rooms/999');
  expect(response?.status()).toBe(404);
});

test('กรองบิลค้างชำระ', async ({ page }) => {
  await page.goto('/bills?status=overdue');
  await expect(page.getByText('5 ใบ')).toBeVisible();
  await expectNoHorizontalScroll(page);
});
