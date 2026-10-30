/** ป้ายบนแถบเปลี่ยนหน้า (แอนิเมชันแบบ C) — pure ใช้ได้ทั้ง server และ client */

export interface RouteLabel {
  /** ชื่อเมนูภาษาอังกฤษ ตัวใหญ่บนแถบ */
  en: string;
  /** ชื่อเมนูภาษาไทย ใต้ชื่ออังกฤษ */
  th: string;
  /** true = แถบเต็ม (หน้าสมาชิก/login) · false = แถบเร็ว (หน้าพนักงานที่ใช้ทั้งวัน) */
  full: boolean;
}

const EXACT: Record<string, RouteLabel> = {
  '/login': { en: 'Sign in', th: 'เข้าสู่ระบบ', full: true },
  '/': { en: 'Dashboard', th: 'แดชบอร์ด', full: false },
  '/reports': { en: 'Reports', th: 'รายงาน', full: false },
  '/checkin': { en: 'Check-in', th: 'เช็กอิน', full: false },
  '/members': { en: 'Members', th: 'สมาชิก', full: false },
  '/members/new': { en: 'New member', th: 'สมัครสมาชิก', full: false },
  '/retention': { en: 'Retention', th: 'ติดตามสมาชิก', full: false },
  '/classes': { en: 'Classes', th: 'ตารางคลาส', full: false },
  '/classes/new': { en: 'New class', th: 'เพิ่มคลาส', full: false },
  '/trainers': { en: 'Trainers', th: 'เทรนเนอร์', full: false },
  '/payments': { en: 'Payments', th: 'รายการชำระ', full: false },
  '/payments/subscriptions': { en: 'Auto-renew', th: 'ตัดบัตรอัตโนมัติ', full: false },
  '/packages': { en: 'Packages', th: 'แพ็กเกจ', full: false },
  '/marketing': { en: 'Reminders', th: 'แจ้งเตือนต่ออายุ', full: false },
  '/marketing/coupons': { en: 'Coupons', th: 'คูปอง & ชวนเพื่อน', full: false },
  '/more': { en: 'Menu', th: 'เมนูทั้งหมด', full: false },
  '/users': { en: 'Users', th: 'บัญชีผู้ใช้', full: false },
  '/roles': { en: 'Roles', th: 'บทบาทและสิทธิ์', full: false },
  '/branding': { en: 'Branding', th: 'แบรนด์สาขา', full: false },
  '/me': { en: 'My card', th: 'บัตรสมาชิก', full: true },
  '/me/classes': { en: 'Book class', th: 'จองคลาส', full: true },
  '/me/workout': { en: 'Workout', th: 'ฝึก', full: true },
  '/me/food': { en: 'Nutrition', th: 'อาหาร', full: true },
};

/** หน้ารายละเอียดที่มี id ใน path (ตรวจตามลำดับ) */
const PATTERNS: [RegExp, RouteLabel][] = [
  [/^\/members\/[^/]+$/, { en: 'Profile', th: 'โปรไฟล์สมาชิก', full: false }],
  [/^\/classes\/[^/]+$/, { en: 'Class', th: 'รายละเอียดคลาส', full: false }],
  [/^\/trainers\/[^/]+$/, { en: 'PT queue', th: 'คิว PT', full: false }],
  [/^\/payments\/[^/]+$/, { en: 'Receipt', th: 'ใบเสร็จ', full: false }],
  [/^\/me\/pay\/[^/]+$/, { en: 'Pay', th: 'ชำระเงิน', full: true }],
];

/** null = ไม่ใช่หน้าในระบบ (เช่น ลิงก์ดาวน์โหลด CSV) → ไม่เล่นแถบเปลี่ยนหน้า */
export function routeLabel(pathname: string): RouteLabel | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return EXACT[path] ?? PATTERNS.find(([re]) => re.test(path))?.[1] ?? null;
}

/** ป้ายของแถบเปลี่ยนหน้าเมื่อ "ไปถึง" หน้านี้ — null = ไม่เล่นแถบ (หน้าที่ไม่ใช่ของระบบ หรือไปหน้า login = ออกจากระบบ/session หมดอายุ) */
export function wipeLabelFor(pathname: string): RouteLabel | null {
  const label = routeLabel(pathname);
  return label && label !== EXACT['/login'] ? label : null;
}

/** ตัวคูณความเร็ว — ต้องตรงกับ --ff-slow ใน app/globals.css (1 = เร็วตามต้นแบบ · มากขึ้น = ช้าลง) */
export const SLOW = 2.0;

/** ระยะเวลาแถบเปลี่ยนหน้าตอนกดเมนู (ms) — แก้ตัวเลขนี้ที่เดียวเพื่อปรับความเร็ว */
export const WIPE_MS = 1500;

/** ระยะเวลาแถบเปลี่ยนหน้า (ms): เข้า 42% · ค้าง 16% · ออก 42% ของ WIPE_MS (ทุกหน้าเท่ากัน) */
export function wipeTiming(_full: boolean): { total: number; enter: number; hold: number; exit: number } {
  const total = WIPE_MS;
  return { total, enter: Math.round(total * 0.42), hold: Math.round(total * 0.16), exit: Math.round(total * 0.42) };
}
