import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from '@repo/testing';

test('หน้าแรก: ค้นหาพร้อมคำแนะนำ แล้วไปหน้าผลการค้นหา', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ใกล้รถไฟฟ้า');
  await page.getByRole('tab', { name: /ซื้อ/ }).click();
  const box = page.getByRole('combobox', { name: /คำค้น/ });
  await box.fill('อารีย์');
  await expect(page.getByRole('option', { name: /อารีย์/ }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
  await box.press('Enter');
  await expect(page).toHaveURL(/\/search\?deal=sale&q=/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ขายอสังหาฯ อารีย์');
});

test('หน้าค้นหา: ตัวกรองอยู่ใน URL และมี empty state', async ({ page }) => {
  await page.goto('/search?deal=rent&pet=1');
  await expect(page.getByText('มีให้เลือก 2 รายการ')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole('button', { name: /^ตัวกรอง/ }).click();
  const sheet = page.getByRole('dialog', { name: 'ตัวกรอง' });
  await sheet.getByRole('combobox', { name: 'ประเภททรัพย์' }).click();
  await sheet.getByRole('option', { name: 'คอนโด' }).click();
  await sheet.getByRole('button', { name: 'ดูผลลัพธ์' }).click();
  await expect(page).toHaveURL(/deal=rent&type=condo.*pet=1/);
  await expect(page.getByText('มีให้เลือก 1 รายการ')).toBeVisible();

  await page.goto('/search?type=warehouse');
  await expect(page.getByText('ไม่พบประกาศที่ตรงกับเงื่อนไข')).toBeVisible();
  await page.getByRole('link', { name: 'ล้างตัวกรอง' }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test('บันทึกประกาศไว้ในรายการโปรด', async ({ page }) => {
  await page.goto('/search?deal=sale&type=land');
  const fav = page.getByRole('button', { name: /บันทึก ที่ดินเปล่า/ });
  await expect(fav).toHaveAttribute('aria-pressed', 'false');
  await fav.click();
  await expect(fav).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/favorites');
  await expect(page.getByRole('link', { name: 'ที่ดินเปล่า วิวดอย หางดง 200 ตร.ว.', exact: true })).toBeVisible();
});

test('หน้าประกาศมี SEO metadata และ JSON-LD (§16)', async ({ page }) => {
  await page.goto('/homes/house-garden-ratchaphruek');
  await expect(page).toHaveTitle(/บ้านเดี่ยวมีสวน ราชพฤกษ์/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/homes\/house-garden-ratchaphruek$/);
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}') as { '@type'?: string };
  expect(jsonLd['@type']).toBe('RealEstateListing');
  await expectNoHorizontalScroll(page);
});

test('ประกาศที่ไม่มีอยู่ตอบ 404 (ไม่เป็น soft 404)', async ({ page }) => {
  const response = await page.goto('/homes/not-a-real-home');
  expect(response?.status()).toBe(404);
});

test('ฟอร์มนัดชมต้องยินยอมก่อนส่ง และส่งสำเร็จเมื่อข้อมูลครบ', async ({ page }) => {
  // แต่ละ test ใช้ IP ของตัวเอง เพื่อไม่ให้แย่งโควตา rate limit 10 ครั้ง/ชม. (§10.6)
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${String(1 + Math.floor(Math.random() * 250))}` });
  await page.goto('/homes/townhouse-ari-renovated');
  await page.getByLabel('ชื่อ', { exact: true }).fill('ทดสอบ ระบบ');
  await page.getByLabel('เบอร์มือถือ').fill('081-234-5678');
  await page.getByRole('button', { name: 'ขอนัดชม / สอบถาม' }).click();
  await expect(page.getByText('กรุณายินยอมให้ติดต่อกลับก่อนส่งข้อมูล')).toBeVisible();

  await page.getByLabel('เบอร์มือถือ').fill('081-234-5678');
  await page.getByLabel('ชื่อ', { exact: true }).fill('ทดสอบ ระบบ');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ขอนัดชม / สอบถาม' }).click();
  await expect(page.locator('#contact').getByRole('status')).toContainText('ส่งข้อมูลถึง ธนา โฮม แล้ว');
});

test('เมนู drawer บนจอเล็ก', async ({ page }) => {
  await page.goto('/');
  const burger = page.getByRole('button', { name: 'เปิดเมนู' });
  test.skip(!(await burger.isVisible()), 'จอเดสก์ท็อปแสดงเมนูเต็ม');
  await expect(burger).toBeEnabled(); // รอ hydrate
  await burger.click();
  const dialog = page.getByRole('dialog', { name: 'เมนู' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(burger).toBeFocused();
});

test('sitemap และ robots', async ({ request }) => {
  expect(await (await request.get('/sitemap.xml')).text()).toContain('/homes/land-hang-dong');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
});
