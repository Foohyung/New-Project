import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll } from '@repo/testing';

/** เบอร์ไม่ซ้ำกันในแต่ละ test (server ใช้ข้อมูลชุดเดียวกันทุก project ที่รันพร้อมกัน) */
const uniquePhone = () => `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

type Role = 'owner' | 'manager' | 'front-desk' | 'trainer' | 'member';
/** บัญชีทดลองจาก src/server/accounts.ts (รหัสผ่านเดียวกันทุกบัญชี = DEMO_PASSWORD) */
const PASSWORD = process.env.DEMO_PASSWORD ?? '123456';
const LOGIN: Record<Role, string> = { owner: 'owner@fitflow.test', manager: 'manager@fitflow.test', 'front-desk': 'desk@fitflow.test', trainer: 'boss@fitflow.test', member: '080-000-0101' };

async function login(page: Page, role: Role, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('อีเมลหรือเบอร์มือถือ').fill(LOGIN[role]);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'));
}

/** เปลี่ยนผู้ใช้: ออกจากบัญชีเดิมแล้วเข้าด้วยบัญชีของบทบาทนั้น (บทบาทมาจากบัญชี เลือกเองไม่ได้) */
async function asRole(page: Page, role: Role) {
  await page.context().clearCookies();
  await login(page, role);
}

// ทุกเทสต์เริ่มจากผู้จัดการที่เข้าสู่ระบบแล้ว ยกเว้นชุด "เข้าสู่ระบบ" ที่ล้าง cookie เอง
test.beforeEach(async ({ page }) => {
  await login(page, 'manager');
});

/** สมัครสมาชิกใหม่ผ่านหน้าเว็บ แล้วคืนเบอร์โทร */
async function signUp(page: Page, method: 'เงินสด' | 'PromptPay' = 'เงินสด'): Promise<string> {
  const phone = uniquePhone();
  await page.goto('/members/new');
  await page.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ อัตโนมัติ');
  await page.getByLabel('เบอร์มือถือ').fill(phone);
  await page.getByRole('radio', { name: /^รายเดือน/ }).check();
  await page.getByRole('radio', { name: method }).check();
  await page.getByRole('checkbox', { name: /ยินยอม/ }).check();
  await page.getByRole('button', { name: method === 'เงินสด' ? 'รับเงินและสมัครสมาชิก' : 'สมัครและสร้าง QR ชำระเงิน' }).click();
  return phone;
}

test.describe('แดชบอร์ด', () => {
  test('แสดงคำทักทายและตัวเลขสำคัญ โดยไม่มี scroll แนวนอน', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toMatch(/'nonce-[^']+'/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('คุณมน');
    await expect(page.getByText('เช็กอินวันนี้')).toBeVisible();
    await expect(page.getByText('รายได้เดือนนี้')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('มีเมนูหลักตามขนาดจอ', async ({ page }) => {
    await page.goto('/');
    const navs = page.getByRole('navigation', { name: 'เมนูหลัก' });
    await expect(navs.filter({ visible: true })).toHaveCount(1);
    const nav = navs.filter({ visible: true });
    // เดสก์ท็อป: กดโซน "หน้าร้าน" ก่อนจึงกางเมนูย่อย (แท็บเล็ตแสดงไอคอนเมนูย่อยทั้งหมดอยู่แล้ว)
    const zone = nav.getByRole('button', { name: 'หน้าร้าน' });
    if (await zone.isVisible()) {
      await expect(zone).toHaveAttribute('aria-expanded', 'false');
      await zone.click();
      await expect(zone).toHaveAttribute('aria-expanded', 'true');
    }
    await nav.getByRole('link', { name: 'สมาชิก', exact: true }).click();
    await expect(page).toHaveURL(/\/members$/);
  });
});

test.describe('เช็กอิน (A.1)', () => {
  test('สมาชิกที่ใช้งานอยู่เช็กอินได้ ด้วยเบอร์หรือข้อความจาก QR', async ({ page }) => {
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill('080-000-0101');
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByText('เช็กอินสำเร็จ')).toBeVisible();
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill('FITFLOW:FF-001955');
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByRole('link', { name: 'ปวีณา ชัยมงคล' }).first()).toBeVisible();
  });

  test('ปฏิเสธเมื่อหมดอายุ พร้อมปุ่มไปต่ออายุ', async ({ page }) => {
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill('FF-002251');
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    // Next.js มี route announcer ที่เป็น role=alert อยู่แล้ว จึงกรองด้วยข้อความ
    const alert = page.getByRole('alert').filter({ hasText: 'เช็กอินไม่ได้' });
    await expect(alert).toContainText('สมาชิกหมดอายุแล้ว');
    await expect(alert.getByRole('link', { name: 'ต่ออายุให้สมาชิก' })).toBeVisible();
  });

  test('แจ้งเมื่อไม่พบสมาชิก', async ({ page }) => {
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill('099-999-9999');
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'เช็กอินไม่ได้' })).toContainText('ไม่พบสมาชิก');
  });
});

test.describe('สมาชิก', () => {
  test('กรองสมาชิกใกล้หมดอายุ', async ({ page }) => {
    await page.goto('/members?status=expiring');
    await expect(page.getByRole('link', { name: /ใกล้หมดอายุ/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('พิมพ์ชนก วงศ์ดี').filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText('วรเมธ พูลผล')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test('ฟอร์มสมัครบอกวิธีแก้เมื่อกรอกไม่ครบ', async ({ page }) => {
    await page.goto('/members/new');
    await page.getByLabel('เบอร์มือถือ').fill('12345');
    await page.getByRole('button', { name: 'รับเงินและสมัครสมาชิก' }).click();
    await expect(page.getByText('กรอกชื่อและนามสกุล')).toBeVisible();
    await expect(page.getByText('กรอกเบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09')).toBeVisible();
    await expect(page.getByText('ต้องได้รับความยินยอมจากสมาชิกก่อนบันทึกข้อมูล')).toBeVisible();
  });

  test('สมัครด้วยเงินสด แล้วเช็กอินได้ทันที', async ({ page }) => {
    const phone = await signUp(page);
    await expect(page.getByText('สมัครสมาชิกเรียบร้อย')).toBeVisible();
    await expect(page.getByRole('img', { name: /QR บัตรสมาชิก/ })).toBeVisible();
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill(phone);
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByText('เช็กอินสำเร็จ')).toBeVisible();
  });

  test('สมัครด้วย PromptPay ต้องยืนยันเงินเข้าก่อนจึงใช้สิทธิ์ได้', async ({ page }) => {
    const phone = await signUp(page, 'PromptPay');
    await expect(page.getByRole('img', { name: /QR PromptPay/ })).toBeVisible();
    const paymentUrl = page.url();
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill(phone);
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'เช็กอินไม่ได้' })).toBeVisible();
    await page.goto(paymentUrl);
    await page.getByRole('button', { name: 'ยืนยันเงินเข้า' }).click();
    const confirmation = page.getByRole('dialog', { name: 'ยืนยันการทำรายการ' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'ยืนยัน' }).click();
    // ยืนยันแล้วหน้าเปลี่ยนเป็นใบเสร็จ และสมาชิกเช็กอินได้
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ใบเสร็จรับเงิน');
    await page.goto('/checkin');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill(phone);
    await page.getByRole('button', { name: 'เช็กอิน', exact: true }).click();
    await expect(page.getByText('เช็กอินสำเร็จ')).toBeVisible();
  });

  test('ต่ออายุและพักสมาชิกจากหน้าโปรไฟล์', async ({ page }) => {
    await signUp(page);
    await page.getByRole('radio', { name: /^3 เดือน/ }).check();
    await page.getByRole('button', { name: 'ยืนยันการต่ออายุ' }).click();
    await expect(page.getByText(/ชำระเงินแล้ว ใช้ได้ถึง/)).toBeVisible();
    await page.getByRole('combobox', { name: 'จำนวนวันที่พัก' }).click();
    await page.getByRole('option', { name: /^30 วัน/ }).click();
    await expect(page.getByRole('combobox', { name: 'จำนวนวันที่พัก' })).toHaveText(/30 วัน/);
    await page.getByRole('button', { name: 'พักสมาชิก' }).click();
    // หลังพัก หน้าโปรไฟล์แสดงช่วงพักและปุ่มยกเลิกการพักแทนฟอร์ม
    await expect(page.getByRole('button', { name: 'ยกเลิกการพัก' })).toBeVisible();
    await expect(page.getByText('พักสมาชิก', { exact: true }).first()).toBeVisible();
  });

  test('สมาชิกที่ไม่มีอยู่ตอบ 404', async ({ page }) => {
    expect((await page.goto('/members/not-a-member'))?.status()).toBe(404);
  });
});

test.describe('คลาส', () => {
  test('ตารางคลาสไม่มี scroll แนวนอน และเปิดรายละเอียดได้', async ({ page }) => {
    await page.goto('/classes');
    await expectNoHorizontalScroll(page);
    await page.getByRole('link', { name: /HIIT Burn/ }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('HIIT Burn');
  });

  test('จองคลาสให้สมาชิก และกันการจองซ้ำ', async ({ page }) => {
    const phone = await signUp(page);
    await page.goto('/classes/bootcamp-2026-10-17');
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill(phone);
    await page.getByRole('button', { name: 'จองให้สมาชิก' }).click();
    await expect(page.getByText('จองให้ ทดสอบ อัตโนมัติ แล้ว')).toBeVisible();
    await page.getByLabel('เบอร์โทรหรือรหัสสมาชิก').fill(phone);
    await page.getByRole('button', { name: 'จองให้สมาชิก' }).click();
    await expect(page.getByText('สมาชิกคนนี้จองคลาสนี้ไว้แล้ว')).toBeVisible();
  });

  test('คลาสที่เต็มจองไม่ได้', async ({ page }) => {
    await page.goto('/classes/spin-2026-10-15');
    await expect(page.getByRole('button', { name: 'จองให้สมาชิก' })).toBeDisabled();
  });
});

test.describe('บทบาทและสิทธิ์', () => {
  test('สมาชิกเข้าสู่ระบบด้วยเบอร์ เห็นบัตร QR และจองคลาสเองได้', async ({ page }) => {
    await asRole(page, 'member');
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole('img', { name: /QR บัตรสมาชิก FF-002318/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto('/me/classes?day=2026-10-21');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('จองคลาส');
    await expectNoHorizontalScroll(page);
  });

  test('สมาชิกเปิดหน้าของพนักงานไม่ได้', async ({ page }) => {
    await asRole(page, 'member');
    await page.goto('/members');
    await expect(page).toHaveURL(/\/me$/);
  });

  test('เคาน์เตอร์ไม่เห็นรายได้และรายงาน', async ({ page }) => {
    await asRole(page, 'front-desk');
    await page.goto('/');
    await expect(page.getByText('รายได้เดือนนี้')).toHaveCount(0);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึง' })).toBeVisible();
    expect((await page.request.get('/reports/export')).status()).toBe(403);
  });

  test('เทรนเนอร์เริ่มที่ตารางคลาส', async ({ page }) => {
    await asRole(page, 'trainer');
    await page.goto('/');
    await expect(page).toHaveURL(/\/classes$/);
    await expect(page.getByText(/คลาสของคุณสัปดาห์นี้/)).toBeVisible();
  });
});

test.describe('การเงินและรายงาน', () => {
  test('ใบเสร็จที่ชำระแล้วพิมพ์ได้', async ({ page }) => {
    await page.goto('/payments/p-101');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ใบเสร็จรับเงิน');
    await expect(page.getByRole('button', { name: 'พิมพ์ใบเสร็จ' })).toBeVisible();
    const receipt = page.getByRole('article', { name: /ใบเสร็จ RC-6910-0101/ });
    await expect(receipt.getByText('ใบกำกับภาษีอย่างย่อ')).toBeVisible();
    await expect(receipt.getByText('(หนึ่งพันสองร้อยบาทถ้วน)')).toBeVisible();
    await expect(receipt.getByText('78.50')).toBeVisible();
    await expectNoHorizontalScroll(page);
    // ตอนพิมพ์ เหลือเฉพาะใบเสร็จ (เมนู/แถบโหมดทดลอง/ปุ่มซ่อน)
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'พิมพ์ใบเสร็จ' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeHidden();
    await expect(receipt).toBeVisible();
  });

  test('ใบแจ้งชำระมี QR PromptPay และพิมพ์ได้', async ({ page }) => {
    await page.goto('/payments/p-109');
    await expect(page.getByRole('heading', { name: 'ใบแจ้งชำระเงิน' })).toBeVisible();
    await expect(page.getByRole('img', { name: /QR PromptPay ยอด/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'พิมพ์ใบแจ้งชำระ' })).toBeVisible();
  });

  test('รายงานส่งออก CSV ได้', async ({ page }) => {
    await page.goto('/reports');
    await expectNoHorizontalScroll(page);
    const csv = await page.request.get('/reports/export');
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect(await csv.text()).toContain('วันที่,รายได้ (บาท),เช็กอิน (คน)');
  });
});

test.describe('มุมมองและตัวกรอง', () => {
  test('รายชื่อสมาชิกสลับ ตาราง/การ์ด/บอร์ด และเรียงตามชื่อได้', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('link', { name: 'การ์ด', exact: true }).click();
    await expect(page).toHaveURL(/view=cards/);
    await expectNoHorizontalScroll(page);
    await page.getByRole('link', { name: 'บอร์ดสถานะ', exact: true }).click();
    await expect(page.getByRole('heading', { name: /ใกล้หมดอายุ/ })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole('combobox', { name: 'เรียงตาม' }).click();
    await page.getByRole('option', { name: 'ชื่อ ก–ฮ' }).click();
    await expect(page).toHaveURL(/sort=name/);
    await expect(page).toHaveURL(/view=board/); // เปลี่ยนการเรียงแล้วมุมมองเดิมยังอยู่
  });

  test('กรองสมาชิกตามแพ็กเกจ', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('combobox', { name: 'แพ็กเกจ' }).click();
    await page.getByRole('option', { name: /^Day pass/ }).click();
    await expect(page).toHaveURL(/pkg=daypass/);
    await expect(page.getByRole('link', { name: 'เอกชัย บุญมา' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'อรวรรณ มีสุข' })).toHaveCount(0);
  });

  test('การเงินดูแบบรายวัน และกรองช่องทางชำระ', async ({ page }) => {
    await page.goto('/payments');
    await page.getByRole('link', { name: 'รายวัน', exact: true }).click();
    await expect(page.getByRole('heading', { name: '15 ตุลาคม 2569' })).toBeVisible();
    await page.getByRole('combobox', { name: 'ช่องทาง' }).click();
    await page.getByRole('option', { name: 'เงินสด' }).click();
    await expect(page).toHaveURL(/method=cash/);
    await expect(page.getByText('วรเมธ พูลผล')).toHaveCount(0); // รายการ PromptPay ถูกกรองออก
    await expectNoHorizontalScroll(page);
  });

  test('ตารางคลาส 4 มุมมอง ไม่มี scroll แนวนอน', async ({ page }) => {
    await page.goto('/classes');
    for (const name of ['รายวันตามห้อง', 'รายการ', 'ตามเทรนเนอร์']) {
      await page.getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      await expectNoHorizontalScroll(page);
    }
    await page.getByRole('combobox', { name: 'เทรนเนอร์' }).click();
    await page.getByRole('option', { name: /^ครูแพร/ }).click();
    await expect(page).toHaveURL(/trainer=t2/);
    await expect(page.getByRole('heading', { name: 'โค้ชบอส' })).toHaveCount(0);
  });
});

test.describe('ธีม', () => {
  test('เปลี่ยนธีมแล้วสีเปลี่ยนทันที และยังอยู่หลังโหลดหน้าใหม่', async ({ page }) => {
    await page.goto('/payments/p-101');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const before = await bg();
    await page.getByRole('combobox', { name: 'ธีม' }).click();
    await page.getByRole('option', { name: /^Daylight/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(bg).not.toBe(before);
    // รอให้ server action บันทึก cookie เสร็จก่อนโหลดหน้าใหม่
    await expect.poll(async () => (await page.context().cookies()).find(c => c.name === 'ff-theme')?.value).toBe('light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('ชุดหาเงินและรักษาสมาชิก', () => {
  test('ต่ออายุที่เคาน์เตอร์ด้วยคูปอง เห็นส่วนลดก่อนกด และอยู่ในใบเสร็จ', async ({ page }) => {
    await signUp(page);
    await expect(page.getByRole('button', { name: 'ยืนยันการต่ออายุ' })).toBeVisible(); // รอให้ไปหน้าโปรไฟล์ก่อน
    await page.getByLabel('โค้ดส่วนลด').fill('nope');
    await page.getByRole('button', { name: 'ใช้โค้ด' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ไม่พบโค้ดนี้' })).toBeVisible();
    await page.getByLabel('โค้ดส่วนลด').fill('STUDENT');
    await page.getByRole('button', { name: 'ใช้โค้ด' }).click();
    await expect(page.getByText('ใช้โค้ด STUDENT แล้ว · ลด ฿200')).toBeVisible();
    await page.getByRole('button', { name: 'ยืนยันการต่ออายุ' }).click();
    await page.getByRole('link', { name: 'ดูรายการชำระ' }).click();
    const receipt = page.getByRole('article', { name: /ใบเสร็จ/ });
    await expect(receipt.getByText('ส่วนลดคูปอง STUDENT')).toBeVisible();
    await expect(receipt.getByText('หักส่วนลด')).toBeVisible();
  });

  test('ผู้จัดการตั้งรอบแจ้งเตือน ส่งรอบวันนี้ และสร้างคูปองได้', async ({ page }) => {
    await page.goto('/marketing');
    await expect(page.getByRole('heading', { name: 'วันนี้ต้องส่ง' })).toBeVisible();
    await page.getByRole('button', { name: 'ส่งรอบวันนี้เลย' }).click();
    await expect(page.getByText(/ส่งแล้ว \d+ คน|วันนี้ไม่มีใครถึงรอบ/)).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto('/marketing/coupons');
    const code = `E2E${String(Date.now()).slice(-6)}`;
    await page.getByLabel('โค้ด', { exact: true }).fill(code);
    await page.getByLabel('คำอธิบาย').fill('ทดสอบอัตโนมัติ');
    await page.getByLabel(/มูลค่า/).fill('5');
    await page.getByRole('button', { name: 'สร้างคูปอง' }).click();
    await expect(page.getByText(`สร้างคูปอง ${code} (ลด 5%) แล้ว`)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('ข้อความเตือนผิดตัวแปรบันทึกไม่ได้ และบอกวิธีแก้', async ({ page }) => {
    await page.goto('/marketing');
    await page.getByText('ก่อน 7 วัน', { exact: true }).click();
    const box = page.getByLabel('ข้อความ').first();
    await box.fill('สวัสดี {ชือ} จ่ายที่ {ลิงก์ชำระ}');
    await page.getByRole('button', { name: 'บันทึกรอบนี้' }).first().click();
    await expect(page.getByText('ไม่รู้จักตัวแปร {ชือ}')).toBeVisible();
  });

  test('เคาน์เตอร์เห็นหน้าติดตามสมาชิก แต่เข้าหน้าการตลาดไม่ได้', async ({ page }) => {
    await asRole(page, 'front-desk');
    await page.goto('/retention');
    await expect(page.getByRole('heading', { name: 'ต้องติดตาม' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto('/marketing');
    await expect(page.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึง' })).toBeVisible();
  });

  test('ตัดบัตรอัตโนมัติ: เห็นรายการตัดไม่ผ่านและส่งลิงก์จ่ายได้', async ({ page }) => {
    await page.goto('/payments/subscriptions');
    await expect(page.getByRole('heading', { name: 'ตัดไม่ผ่าน' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'ตัดบัตรรอบวันนี้' }).click();
    await expect(page.getByText(/ตัดผ่าน \d+ · ไม่ผ่าน \d+|ไม่มีรายการถึงกำหนดวันนี้/)).toBeVisible();
  });

  test('สมาชิกเปิดลิงก์จากข้อความเตือน เห็นราคาหลังลด และมีโค้ดชวนเพื่อน', async ({ page }) => {
    await asRole(page, 'member');
    await page.goto('/me?coupon=RENEW10&from=reminder');
    await expect(page.getByText(/ใช้โค้ด RENEW10 แล้ว/)).toBeVisible();
    await expect(page.getByText('฿1,080')).toBeVisible();
    await expect(page.getByText('FRIEND-2318')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ต่ออายุอัตโนมัติ' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe('ตัวกรองช่วงวันที่', () => {
  test('การเงินกรองตามวันที่ทำรายการ และคงตัวกรองอื่นไว้', async ({ page }) => {
    await page.goto('/payments?method=promptpay');
    await page.getByRole('region', { name: 'วันที่ทำรายการ' }).getByRole('button').click();
    const picker = page.getByRole('dialog', { name: 'วันที่ทำรายการ' });
    await picker.getByRole('button', { name: '10 ต.ค. 2569' }).click();
    await picker.getByRole('button', { name: '10 ต.ค. 2569' }).click();
    await expect(picker.getByRole('button', { name: '16 ต.ค. 2569' })).toBeDisabled(); // ตัวกรองย้อนหลังเลือกอนาคตไม่ได้
    await picker.getByRole('button', { name: 'ใช้ช่วงนี้' }).click();
    await expect(page).toHaveURL(/from=2026-10-10/);
    await expect(page).toHaveURL(/method=promptpay/);
    await expect(page.getByRole('link', { name: 'อรวรรณ มีสุข' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'วรเมธ พูลผล' })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test('รายงานใช้ช่วงด่วน และไฟล์ CSV ออกตามช่วงเดียวกัน', async ({ page }) => {
    await page.goto('/reports');
    await page.getByRole('region', { name: 'ช่วงวันที่' }).getByRole('button').click();
    const picker = page.getByRole('dialog', { name: 'ช่วงวันที่' });
    await picker.getByRole('button', { name: '7 วัน', exact: true }).click();
    await expect(picker.getByText(/รวมในช่วงที่เลือก/)).toBeVisible();
    await picker.getByRole('button', { name: 'ใช้ช่วงนี้' }).click();
    await expect(page).toHaveURL(/from=2026-10-09&to=2026-10-15/);
    await expect(page.getByText('รายได้ในช่วงนี้')).toBeVisible();
    const csv = await page.request.get('/reports/export?from=2026-10-09&to=2026-10-15');
    expect(csv.status()).toBe(200);
    expect(csv.headers()['content-disposition']).toContain('2026-10-09_2026-10-15');
    expect((await csv.text()).trim().split('\n')).toHaveLength(8); // หัวตาราง + 7 วัน
    await expectNoHorizontalScroll(page);
  });

  test('สมาชิกกรองตามวันหมดอายุ 7 วันข้างหน้า', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('region', { name: 'วันหมดอายุ' }).getByRole('button').click();
    const picker = page.getByRole('dialog', { name: 'วันหมดอายุ' });
    await picker.getByRole('button', { name: '7 วันข้างหน้า' }).click();
    await picker.getByRole('button', { name: 'ใช้ช่วงนี้' }).click();
    await expect(page).toHaveURL(/to=2026-10-21/);
    await expect(page.getByRole('link', { name: 'ณัฐพล ศรีสุข' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'พิมพ์ชนก วงศ์ดี' }).first()).toBeVisible();
  });
});

test.describe('เข้าสู่ระบบ', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('ยังไม่เข้าสู่ระบบถูกพาไปหน้า login แล้วกลับมาหน้าเดิม', async ({ page }) => {
    await page.goto('/members/02');
    await expect(page).toHaveURL(/\/login\?next=%2Fmembers%2F02$/);
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
    await expect(page.getByText(/ดูในฐานะ|เลือกบทบาท/)).toHaveCount(0); // ไม่มีให้เลือกบทบาท
    await expectNoHorizontalScroll(page);
    await page.getByLabel('อีเมลหรือเบอร์มือถือ').fill('Manager@FitFlow.test');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(/\/members\/02$/);
  });

  test('รหัสผิดบอกแบบไม่เปิดเผยว่าบัญชีมีอยู่ และใส่ผิดหลายครั้งถูกล็อก', async ({ page }, info) => {
    await page.goto('/login');
    const user = `nobody-${info.project.name}-${String(Date.now())}@fitflow.test`;
    for (let i = 0; i < 4; i++) {
      await page.getByLabel('อีเมลหรือเบอร์มือถือ').fill(user);
      await page.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong-password');
      await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
      // รอให้ส่งเสร็จจริง (ฟอร์มล้างรหัสผ่าน) ก่อนลองรอบถัดไป — ข้อความ error ของรอบก่อนยังค้างอยู่บนจอ
      await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toHaveValue('');
      await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeEnabled();
      await expect(page.getByRole('alert').filter({ hasText: 'ไม่ถูกต้อง' })).toBeVisible();
    }
    // ช่องอีเมลยังค้างไว้ ใส่แค่รหัสผ่านใหม่
    await expect(page.getByLabel('อีเมลหรือเบอร์มือถือ')).toHaveValue(user);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ถูกล็อก' })).toBeVisible();
  });

  test('บทบาทมาจากบัญชี: เทรนเนอร์ไปตารางคลาส สมาชิกไปบัตรสมาชิก', async ({ page }) => {
    await login(page, 'trainer');
    await expect(page).toHaveURL(/\/classes$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ตารางคลาส');
    await page.context().clearCookies();
    await login(page, 'member');
    await expect(page).toHaveURL(/\/me$/);
  });

  test('ออกจากระบบแล้วกลับเข้าหน้าเดิมไม่ได้', async ({ page }) => {
    await login(page, 'front-desk');
    const logout = page.getByRole('button', { name: 'ออกจากระบบ' });
    await logout.click();
    const confirmation = page.getByRole('dialog', { name: 'ยืนยันออกจากระบบ' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(confirmation).toBeHidden();
    await expect(page).not.toHaveURL(/\/login$/);
    await logout.click();
    await confirmation.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/checkin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Dropdown ใช้คีย์บอร์ดได้ (เลือกธีม)', async ({ page }) => {
    await login(page, 'manager');
    const theme = page.getByRole('combobox', { name: 'ธีม' });
    await theme.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset');
  });
});

test.describe('ตัวช่วยฝึกและอาหาร (สมาชิก)', () => {
  test('พนักงานใช้ได้ด้วย แต่เห็นเฉพาะข้อมูลของบัญชีตัวเอง', async ({ page }, testInfo) => {
    // beforeEach เข้าสู่ระบบเป็นผู้จัดการแล้ว
    if (testInfo.project.name === 'desktop') {
      const menu = page.getByRole('complementary').getByRole('navigation', { name: 'เมนูหลัก' });
      await menu.getByRole('button', { name: /ฝึก/ }).click();
      await expect(menu.getByRole('link', { name: 'อาหาร' })).toBeVisible();
    }
    await page.goto('/me/workout');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ฝึกวันนี้');
    await page.goto('/me/food');
    // ผู้จัดการยังไม่ได้กรอกข้อมูลร่างกาย → เห็นฟอร์มตั้งค่าของตัวเอง ไม่ใช่ข้อมูลของสมาชิก
    await expect(page.getByRole('button', { name: 'คำนวณเป้าอาหารของฉัน' })).toBeVisible();
  });

  test('เลือกกล้ามเนื้อทีละมัดจากภาพร่างกาย แล้วเพิ่มท่าลงโปรแกรมวันนี้', async ({ page }, testInfo) => {
    await asRole(page, 'member');
    await page.goto('/me/workout');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ฝึกวันนี้');
    await expectNoHorizontalScroll(page);
    const muscles = page.getByRole('group', { name: 'กล้ามเนื้อ', exact: true });
    await muscles.getByRole('button', { name: 'ต้นขาหน้า' }).click();
    await muscles.getByRole('button', { name: 'อกบน' }).click();
    await expect(muscles.getByRole('button', { name: 'ต้นขาหน้า' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'ท่าฝึก · ต้นขาหน้า' })).toBeVisible();
    // เลือกทีละมัด: ต้นขาหน้าไม่ได้ท่าของต้นขาหลัง
    await expect(page.getByText('Lying Leg Curl')).toHaveCount(0);
    // ทุก project ใช้สมาชิกคนเดียวกัน — เขียนข้อมูลเฉพาะ desktop เพื่อไม่ให้ชนกัน
    test.skip(testInfo.project.name !== 'desktop', 'แก้โปรแกรมเฉพาะ desktop');
    await page.getByRole('button', { name: /เพิ่มลงโปรแกรมวันนี้/ }).click();
    const plan = page.getByRole('region', { name: 'โปรแกรมวันนี้' });
    await expect(plan.getByText('Back Squat')).toBeVisible();
    const done = plan.getByRole('button', { name: /^Back Squat/ });
    await done.click();
    await expect(done).toHaveAttribute('aria-pressed', 'true');
    await expect(plan.getByText(/เสร็จ 1\//)).toBeVisible();
  });

  test('อาหาร: เห็นเป้าวันนี้ บันทึกเมนูแนะนำ และถอน/ให้ความยินยอมข้อมูลสุขภาพ', async ({ page }, testInfo) => {
    await asRole(page, 'member');
    await page.goto('/me/food');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('อาหารวันนี้');
    await expectNoHorizontalScroll(page);
    test.skip(testInfo.project.name !== 'desktop', 'แก้ข้อมูลสุขภาพเฉพาะ desktop');
    await expect(page.getByRole('img', { name: /กินไปแล้ว .* กิโลแคลอรี/ })).toBeVisible();
    await page.getByRole('button', { name: 'กินแล้ว' }).first().click();
    await expect(page.getByRole('status').filter({ hasText: /^บันทึก .* แล้ว$/ })).toBeVisible();

    await page.getByRole('button', { name: 'ถอนความยินยอมและลบข้อมูล' }).click();
    await page.getByRole('dialog', { name: 'ยืนยันการทำรายการ' }).getByRole('button', { name: 'ยืนยัน' }).click();
    await expect(page.getByRole('button', { name: 'คำนวณเป้าอาหารของฉัน' })).toBeVisible();

    // ไม่ติ๊กยินยอม = ไม่บันทึก
    await page.getByRole('radio', { name: /^ลดไขมัน/ }).check();
    await page.getByRole('radio', { name: 'ชาย' }).check();
    await page.getByLabel('ปีเกิด (ค.ศ.)').fill('1994');
    await page.getByLabel('ส่วนสูง (ซม.)').fill('174');
    await page.getByLabel('น้ำหนัก (กก.)').fill('78');
    await page.getByRole('radio', { name: /3–5 วัน/ }).check();
    await page.getByRole('button', { name: 'คำนวณเป้าอาหารของฉัน' }).click();
    await expect(page.getByText('ต้องยินยอมให้เก็บข้อมูลสุขภาพก่อน จึงคำนวณเป้าอาหารได้')).toBeVisible();

    await page.getByRole('checkbox', { name: /ยินยอมให้เก็บข้อมูลสุขภาพ/ }).check();
    await page.getByRole('button', { name: 'คำนวณเป้าอาหารของฉัน' }).click();
    await expect(page.getByRole('img', { name: /กินไปแล้ว 0 จาก/ })).toBeVisible();
  });
});
