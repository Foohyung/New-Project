// ข้อมูลสำหรับ SEO / AEO / GEO ของหน้าแรกสาธารณะ (หน้า /) — logic ล้วน ไม่แตะฐานข้อมูล
// ใช้ร่วมกันทั้ง metadata, JSON-LD (schema.org), หัวข้อคำถามที่พบบ่อย, sitemap/robots และ /llms.txt ให้ข้อมูลตรงกันทุกที่
import { BUYOUT_PRICE, RENT_PRICE } from '@/api/services/landing/landing/landing.service';

export const SITE_NAME = 'FitFlow';
export const SITE_TITLE = 'FitFlow — ระบบจัดการฟิตเนส ครบในที่เดียว';
export const SITE_DESCRIPTION = 'โปรแกรมจัดการฟิตเนสและยิมสำหรับเจ้าของยิมในไทย: สมาชิก เช็กอิน QR คลาส เทรนเนอร์ การเงิน ใบเสร็จ คูปอง และหลายสาขาในระบบเดียว เตือนต่ออายุอัตโนมัติและบอกว่าใครกำลังจะหลุด';
export const SITE_KEYWORDS = [
  'ระบบจัดการฟิตเนส', 'โปรแกรมจัดการยิม', 'ระบบสมาชิกฟิตเนส', 'โปรแกรมฟิตเนส', 'ระบบเช็กอิน QR', 'ระบบจองคลาส',
  'โปรแกรมบริหารยิม', 'ระบบยิมหลายสาขา', 'gym management software', 'fitness management system',
];
const DEFAULT_SITE_URL = 'https://fitflows.site';

/** โดเมนจริงของเว็บจาก env `APP_URL` (ไม่มี/ไม่ใช่ http(s) = fitflows.site) — ไม่มี / ท้าย */
export function siteUrl(raw: string | undefined = process.env.APP_URL): string {
  const value = raw?.trim();
  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
    } catch { /* ใช้ค่าเริ่มต้น */ }
  }
  return DEFAULT_SITE_URL;
}

/** คำถามที่พบบ่อย — แสดงบนหน้าแรกและใส่เป็น FAQPage ให้ Google / AI ดึงคำตอบไปตอบได้ตรง ๆ (AEO) */
export const FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'FitFlow คืออะไร',
    a: 'FitFlow คือระบบจัดการฟิตเนสบนเว็บสำหรับเจ้าของยิมในไทย รวมงานสมาชิก เช็กอิน QR ตารางคลาส คอร์สเทรนเนอร์ รับเงินและใบเสร็จ ขายสินค้าหน้าร้าน คูปอง และรายงานไว้ในระบบเดียว ใช้ได้ทั้งคอมพิวเตอร์ แท็บเล็ต และมือถือ',
  },
  {
    q: 'ราคาเท่าไหร่',
    a: `แบบเช่าใช้ ${RENT_PRICE.month.amount.toLocaleString('en-US')} บาทต่อเดือน หรือ ${RENT_PRICE.year.amount.toLocaleString('en-US')} บาทต่อปี (จ่าย 10 เดือนได้ 12 เดือน) และแบบซื้อขาด ${BUYOUT_PRICE.amount.toLocaleString('en-US')} บาทครั้งเดียว ทุกแบบสมาชิกไม่จำกัด`,
  },
  {
    q: 'สมาชิกเช็กอินเข้ายิมอย่างไร',
    a: 'สมาชิกเข้าระบบด้วยเบอร์โทร เปิดบัตร QR ในมือถือ แล้วให้เคาน์เตอร์สแกน ระบบตรวจวันหมดอายุและจำนวนครั้งที่เหลือให้เอง ถ้าลืมมือถือพิมพ์เบอร์โทรแทนได้',
  },
  {
    q: 'ระบบช่วยให้สมาชิกต่ออายุได้อย่างไร',
    a: 'ตั้งรอบเตือนครั้งเดียว ระบบส่งข้อความเตือนก่อนหมดอายุพร้อมลิงก์จ่าย ใช้คูปองหรือโค้ดชวนเพื่อนได้ และจัดลำดับสมาชิกที่เริ่มหายไปจากยิมให้ทีมโทรตาม',
  },
  {
    q: 'ใช้กับยิมหลายสาขาได้ไหม',
    a: 'ได้ ข้อมูลและรายงานแยกตามสาขา แต่ละสาขาตั้งโลโก้ สีแบรนด์ หัวใบเสร็จ และเลขที่ใบเสร็จของตัวเองได้ เจ้าของดูรวมทุกสาขาได้ในที่เดียว',
  },
  {
    q: 'ออกใบเสร็จและรับ PromptPay ได้ไหม',
    a: 'ได้ ระบบออกใบเสร็จ A4 แยก VAT พิมพ์ได้ทันที และตั้ง PromptPay ของแต่ละสาขาให้สมาชิกสแกนจ่ายได้',
  },
  {
    q: 'พนักงานแต่ละตำแหน่งเห็นอะไรบ้าง',
    a: 'แบ่งสิทธิ์ตามตำแหน่ง เจ้าของ ผู้จัดการ เคาน์เตอร์ เทรนเนอร์ และสมาชิก แต่ละคนเห็นเฉพาะเมนูที่ต้องใช้ และมีประวัติการเข้าระบบให้ตรวจสอบ',
  },
];

/** เส้นทางที่ไม่ให้ bot เก็บ (หลังเข้าสู่ระบบ / API) — หน้าเหล่านี้มี noindex อยู่แล้ว ใส่ใน robots.txt อีกชั้น */
export const PRIVATE_PATHS = [
  '/api/', '/me', '/dashboard', '/members', '/checkin', '/classes', '/courses', '/trainers', '/packages', '/payments',
  '/payment-settings', '/sales', '/products', '/coupons', '/reminders', '/reports', '/retention', '/users', '/roles',
  '/branches', '/branding', '/access-logs', '/password-resets', '/more', '/forgot-password',
];

/** bot ของ AI search / answer engine ที่อนุญาตให้อ่านหน้าสาธารณะ (GEO) */
export const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];

/** JSON-LD (schema.org) ของหน้าแรก: Organization + WebSite + SoftwareApplication (ราคา) + FAQPage */
export function landingJsonLd(base: string): Record<string, unknown> {
  const org = `${base}/#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': org, name: SITE_NAME, url: `${base}/`, logo: `${base}/icon.svg` },
      { '@type': 'WebSite', '@id': `${base}/#website`, name: SITE_NAME, url: `${base}/`, inLanguage: 'th-TH', publisher: { '@id': org } },
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: `${base}/`,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Gym management software',
        operatingSystem: 'Web browser (Windows, macOS, iOS, Android)',
        inLanguage: 'th-TH',
        publisher: { '@id': org },
        featureList: [
          'ระบบสมาชิกและแพ็กเกจ', 'เช็กอินด้วย QR', 'ตารางคลาสและจองคลาส', 'คอร์สเทรนเนอร์', 'รับเงิน ใบเสร็จ A4 และ PromptPay',
          'ขายสินค้าหน้าร้าน (POS)', 'คูปองและโค้ดชวนเพื่อน', 'เตือนต่ออายุอัตโนมัติ', 'วิเคราะห์สมาชิกเสี่ยงหลุด', 'หลายสาขา', 'สิทธิ์ตามตำแหน่ง',
        ],
        offers: [
          { '@type': 'Offer', name: 'เช่าใช้รายเดือน', price: RENT_PRICE.month.amount, priceCurrency: 'THB', url: `${base}/#pricing` },
          { '@type': 'Offer', name: 'เช่าใช้รายปี', price: RENT_PRICE.year.amount, priceCurrency: 'THB', url: `${base}/#pricing` },
          { '@type': 'Offer', name: 'ซื้อขาด', price: BUYOUT_PRICE.amount, priceCurrency: 'THB', url: `${base}/#pricing` },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        inLanguage: 'th-TH',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
}

/** JSON ที่ฝังใน <script type="application/ld+json"> ได้ปลอดภัย (กัน </script> ปิดแท็กก่อน) */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** /llms.txt — สรุปเว็บแบบ Markdown ให้ AI (ChatGPT, Claude, Perplexity ฯลฯ) อ่านและอ้างอิงได้ถูกต้อง (GEO) */
export function llmsTxt(base: string): string {
  return [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '## ฟีเจอร์หลัก',
    '- เช็กอินด้วย QR: เคาน์เตอร์สแกนครั้งเดียว ระบบตรวจวันหมดอายุและจำนวนครั้งที่เหลือ ปฏิเสธเองเมื่อหมดอายุ',
    '- เตือนต่ออายุอัตโนมัติพร้อมลิงก์จ่าย คูปอง และโค้ดชวนเพื่อน',
    '- วิเคราะห์สมาชิกเสี่ยงหลุดจากความถี่การเช็กอินจริง และบันทึกผลการโทรตาม',
    '- สมาชิกและแพ็กเกจ (รายเดือน รายครั้ง ครึ่งเดือน พักสมาชิก)',
    '- ตารางคลาส จองคลาส คอร์สเรียนกับเทรนเนอร์',
    '- รับเงิน ใบเสร็จ A4 แยก VAT, PromptPay, ขายสินค้าหน้าร้าน (POS) และสต็อก',
    '- หลายสาขา แยกข้อมูล/รายงาน/แบรนด์/เลขที่ใบเสร็จตามสาขา',
    '- สิทธิ์ตามตำแหน่ง 5 แบบ: เจ้าของ ผู้จัดการ เคาน์เตอร์ เทรนเนอร์ สมาชิก',
    '',
    '## ราคา (บาท)',
    `- เช่าใช้: ${RENT_PRICE.month.amount.toLocaleString('en-US')} / เดือน หรือ ${RENT_PRICE.year.amount.toLocaleString('en-US')} / ปี — 1 สาขา สมาชิกไม่จำกัด รวมโฮสติ้ง`,
    `- ซื้อขาด: ${BUYOUT_PRICE.amount.toLocaleString('en-US')} ครั้งเดียว — ไม่จำกัดสาขา ดูแลรายปี 9,900 (ไม่บังคับ)`,
    '',
    '## คำถามที่พบบ่อย',
    ...FAQ.flatMap(f => [`### ${f.q}`, f.a, '']),
    '## ลิงก์',
    `- [หน้าแรก](${base}/)`,
    `- [ฟีเจอร์](${base}/#features)`,
    `- [ราคา](${base}/#pricing)`,
    `- [คำถามที่พบบ่อย](${base}/#faq)`,
    `- [เข้าสู่ระบบ](${base}/login)`,
    '',
  ].join('\n');
}
