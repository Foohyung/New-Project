import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from '@repo/testing';

test('หน้าแรกกรองบ้านตามไลฟ์สไตล์', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('บ้านที่ใช่');
  const homes = page.locator('#homes');
  await expect(homes.getByText('พบ 6 หลัง')).toBeVisible();
  await homes.getByRole('button', { name: '🐶 เลี้ยงสัตว์ได้' }).click();
  await expect(homes.getByText('พบ 3 หลัง')).toBeVisible();
  await expect(homes.getByRole('button', { name: '🐶 เลี้ยงสัตว์ได้' })).toHaveAttribute('aria-pressed', 'true');
  await expectNoHorizontalScroll(page);
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
  await expect(page.getByRole('status')).toContainText('ส่งข้อมูลถึง ธนา โฮม แล้ว');
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
