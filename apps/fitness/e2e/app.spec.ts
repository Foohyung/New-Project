import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll } from '@repo/testing';

/** เบอร์ไม่ซ้ำกันในแต่ละ test (server ใช้ข้อมูลชุดเดียวกันทุก project ที่รันพร้อมกัน) */
const uniquePhone = () => `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

async function asRole(page: Page, role: 'owner' | 'manager' | 'front-desk' | 'trainer' | 'member') {
  await page.context().addCookies([{ name: 'ff-demo-role', value: role, url: 'http://localhost:3001' }]);
}

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
    await navs.filter({ visible: true }).getByRole('link', { name: 'สมาชิก', exact: true }).click();
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
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: 'ยืนยันเงินเข้า' }).click();
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
  test('สลับเป็นสมาชิก เห็นบัตร QR และจองคลาสเองได้', async ({ page }) => {
    await page.goto('/');
    // ใช้คีย์บอร์ดเลือก เพื่อทดสอบ Dropdown แบบ combobox ไปด้วย
    const role = page.getByRole('combobox', { name: 'ดูในฐานะ' });
    await role.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
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
    await expect(page.getByRole('combobox', { name: 'ดูในฐานะ' })).toBeHidden();
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
