// ข้อมูลตัวอย่างสำหรับทดลองระบบ/สาธิต (ชื่อและเบอร์โทรเป็นข้อมูลสมมติทั้งหมด)
// ไม่ได้รันอัตโนมัติ — รันเองเมื่อต้องการ:
//
//   node prisma/sample-data.mjs           เพิ่มข้อมูลตัวอย่าง (ฐานข้อมูลต้องยังไม่มีข้อมูลตัวอย่างชุดนี้)
//   node prisma/sample-data.mjs --reset   ⚠️ ลบข้อมูลทุกตารางก่อน แล้วใส่ข้อมูลตัวอย่างใหม่ — ห้ามใช้กับฐานข้อมูลจริง
//
// ข้อมูลอิงวันที่ 15 ต.ค. 2569 — ตั้ง DEMO_CLOCK=on ใน .env เพื่อให้ระบบตรึงเวลาตรงกับข้อมูลชุดนี้
// บัญชีตัวอย่างทุกบัญชีใช้รหัสผ่าน DEMO_PASSWORD ใน .env (ค่าเริ่มต้น 1234)
import { existsSync } from 'node:fs';
import path from 'node:path';
import mariadb from 'mariadb';
import { connectionConfig, hashPassword, seedBase } from './seed.mjs';

const root = path.resolve(import.meta.dirname, '..');
for (const file of ['.env.local', '.env']) {
  if (existsSync(path.join(root, file))) process.loadEnvFile(path.join(root, file));
}

const BRANCH = 'สาขาอารีย์';
const DAY = 86_400_000;
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const weekday = date => new Date(`${date}T00:00:00Z`).getUTCDay();
const toInstant = (date, time) => new Date(`${date}T${time}:00+07:00`);
const at = iso => new Date(iso);

/* ---------- ข้อมูล ---------- */

const MEMBERS = [
  { id: '01', code: 'FF-002318', name: 'ณัฐพล ศรีสุข', phone: '0800000101', email: 'nattapol@example.com', joinedOn: '2024-08-13', packageId: 'gold12', expiresOn: '2027-08-12', freeze: null, pt: 0, lastCheckInAt: '2026-10-15T11:42:00Z', note: null },
  { id: '02', code: 'FF-001842', name: 'พิมพ์ชนก วงศ์ดี', phone: '0800000102', email: null, joinedOn: '2025-06-19', packageId: 'monthly', expiresOn: '2026-10-18', freeze: null, pt: 0, lastCheckInAt: '2026-10-14T12:10:00Z', note: null },
  { id: '03', code: 'FF-002107', name: 'ธนกร แก้วมณี', phone: '0800000103', email: 'thanakorn@example.com', joinedOn: '2025-12-01', packageId: '3m', expiresOn: '2026-11-30', freeze: null, pt: 3, lastCheckInAt: '2026-10-15T11:36:00Z', note: 'เป้าหมาย: ลดไขมัน 5 กก.' },
  { id: '04', code: 'FF-001377', name: 'กมลชนก อินทร์แก้ว', phone: '0800000104', email: null, joinedOn: '2025-07-03', packageId: '6m', expiresOn: '2027-01-02', freeze: ['2026-10-01', '2026-11-14'], pt: 0, lastCheckInAt: '2026-09-30T00:20:00Z', note: 'พักสมาชิก: เดินทางต่างประเทศ' },
  { id: '05', code: 'FF-002251', name: 'วรเมธ พูลผล', phone: '0800000105', email: null, joinedOn: '2026-03-10', packageId: 'monthly', expiresOn: '2026-10-09', freeze: null, pt: 0, lastCheckInAt: '2026-10-03T13:05:00Z', note: null },
  { id: '06', code: 'FF-000958', name: 'ศิริพร ทองคำ', phone: '0800000106', email: 'siriporn@example.com', joinedOn: '2023-03-22', packageId: 'gold12', expiresOn: '2027-03-21', freeze: null, pt: 5, lastCheckInAt: '2026-10-14T23:48:00Z', note: null },
  { id: '07', code: 'FF-001603', name: 'สุรเชษฐ์ นาคสวัสดิ์', phone: '0800000107', email: null, joinedOn: '2025-10-20', packageId: '3m', expiresOn: '2026-10-19', freeze: null, pt: 0, lastCheckInAt: '2026-10-13T11:00:00Z', note: null },
  { id: '08', code: 'FF-002034', name: 'จิราภรณ์ แสงทอง', phone: '0800000108', email: null, joinedOn: '2026-01-21', packageId: 'monthly', expiresOn: '2026-10-20', freeze: null, pt: 0, lastCheckInAt: '2026-10-15T00:15:00Z', note: null },
  { id: '09', code: 'FF-001128', name: 'ภาคิน รัตนวงศ์', phone: '0800000109', email: null, joinedOn: '2025-04-22', packageId: '6m', expiresOn: '2026-10-17', freeze: null, pt: 0, lastCheckInAt: '2026-10-11T10:30:00Z', note: null },
  { id: '10', code: 'FF-002290', name: 'อรวรรณ มีสุข', phone: '0800000110', email: null, joinedOn: '2026-07-11', packageId: 'monthly', expiresOn: '2026-11-10', freeze: null, pt: 0, lastCheckInAt: '2026-10-15T11:40:00Z', note: null },
  { id: '11', code: 'FF-001955', name: 'ปวีณา ชัยมงคล', phone: '0800000111', email: 'paweena@example.com', joinedOn: '2025-08-15', packageId: '6m', expiresOn: '2027-02-14', freeze: null, pt: 0, lastCheckInAt: '2026-10-15T11:33:00Z', note: null },
  { id: '12', code: 'FF-002330', name: 'เอกชัย บุญมา', phone: '0800000112', email: null, joinedOn: '2026-10-15', packageId: 'daypass', expiresOn: '2026-10-15', freeze: null, pt: 0, lastCheckInAt: '2026-10-15T11:31:00Z', note: null },
];

/** [ยี่ห้อ, 4 หลักท้าย, หมดอายุบัตร, เริ่มต่ออายุอัตโนมัติ] */
const AUTO_RENEW = {
  '01': ['visa', '4242', '08/28', '2025-08-13'],
  '07': ['visa', '4242', '08/28', '2025-10-20'],
  '09': ['visa', '0002', '02/27', '2025-04-22'],
  '05': ['visa', '0002', '02/27', '2026-03-10'],
  '06': ['mastercard', '5454', '11/27', '2024-03-22'],
  '10': ['visa', '4242', '08/28', '2026-08-11'],
  '11': ['visa', '4242', '08/28', '2026-02-15'],
};
/** ไม่ยินยอมรับข่าวสาร */
const NO_MARKETING = new Set(['08']);

const TRAINERS = [
  { id: 't1', name: 'ณัฐวุฒิ บุญเลิศ', nickname: 'โค้ชบอส', specialties: ['HIIT', 'Functional'], bio: 'อดีตนักกีฬาฟุตบอล เน้นความฟิตและการเผาผลาญ', color: 'var(--color-lime)' },
  { id: 't2', name: 'พิชญา สายทอง', nickname: 'ครูแพร', specialties: ['Yoga', 'Pilates'], bio: 'ครูโยคะ RYT-500 ดูแลเรื่องความยืดหยุ่นและแกนกลางลำตัว', color: 'var(--color-violet)' },
  { id: 't3', name: 'จิรายุ ทองดี', nickname: 'โค้ชเจ', specialties: ['Spin', 'Cardio'], bio: 'นักปั่นจักรยานสมัครเล่น ชอบเพลงมันส์และคลาสพลังสูง', color: 'var(--color-cyan)' },
  { id: 't4', name: 'ศุภกร ใจงาม', nickname: 'โค้ชมิว', specialties: ['เวทเทรนนิ่ง', 'Body composition'], bio: 'เทรนเนอร์ส่วนตัว 8 ปี ดูแลโปรแกรมเพิ่มกล้ามและลดไขมัน', color: 'var(--color-warn)' },
];

/** บัญชีตัวอย่าง [id, login, ชื่อ, ชื่อเล่น, บทบาท, trainerId, memberId] */
const USERS = [
  ['staff-admin', 'admin@fitflow.test', 'ผู้ดูแลระบบ', 'แอดมิน', 'admin', null, null],
  ['staff-00', 'owner@fitflow.test', 'กิตติพงษ์ ส.', 'กต', 'owner', null, null],
  ['staff-05', '67103', 'กิตติพงศ์ ส.', 'กต', 'owner', null, null],
  ['staff-06', 'tatar', 'Tatar', 'Tatar', 'owner', null, null],
  ['staff-01', 'manager@fitflow.test', 'มนัสนันท์ ร.', 'มน', 'manager', null, null],
  ['staff-02', 'desk@fitflow.test', 'ปริญญา ท.', 'ปริ', 'front-desk', null, null],
  ['staff-03', 'boss@fitflow.test', 'ณัฐวุฒิ บ.', 'บอส', 'trainer', 't1', null],
  ['member-01', '0800000101', 'ณัฐพล ศรีสุข', 'ณัฐพล', 'member', null, '01'],
];

const CLASS_TEMPLATES = [
  { slug: 'morning-yoga', title: 'Morning Yoga', trainerId: 't2', room: 'ห้อง B', time: '07:00', minutes: 60, capacity: 20, level: 'ง่าย', weekdays: [1, 2, 3, 4, 5] },
  { slug: 'body-pump', title: 'Body Pump', trainerId: 't4', room: 'ห้อง A', time: '12:00', minutes: 50, capacity: 22, level: 'กลาง', weekdays: [1, 3, 5] },
  { slug: 'hiit', title: 'HIIT Burn', trainerId: 't1', room: 'ห้อง A', time: '18:00', minutes: 45, capacity: 25, level: 'หนัก', weekdays: [1, 2, 3, 4, 5] },
  { slug: 'yoga-flow', title: 'Yoga Flow', trainerId: 't2', room: 'ห้อง B', time: '19:00', minutes: 60, capacity: 20, level: 'ง่าย', weekdays: [2, 4, 6] },
  { slug: 'spin', title: 'Spin Power', trainerId: 't3', room: 'ห้อง Spin', time: '20:00', minutes: 45, capacity: 20, level: 'หนัก', weekdays: [1, 3, 4, 5] },
  { slug: 'bootcamp', title: 'Weekend Bootcamp', trainerId: 't1', room: 'ลานกลางแจ้ง', time: '09:00', minutes: 60, capacity: 30, level: 'หนัก', weekdays: [6, 0] },
  { slug: 'pilates', title: 'Pilates Core', trainerId: 't2', room: 'ห้อง B', time: '10:00', minutes: 50, capacity: 15, level: 'กลาง', weekdays: [6, 0] },
];
const SCHEDULE_START = '2026-10-12';
const SCHEDULE_DAYS = 21;
/** ผู้จองนอกระบบ (walk-in) ให้คลาสวันนี้ตรงกับ design (HIIT 24/25, Yoga 12/20, Spin เต็ม) */
const OTHER_BOOKED = { 'hiit-2026-10-15': 22, 'yoga-flow-2026-10-15': 11, 'spin-2026-10-15': 19 };

function classes() {
  const out = [];
  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const date = addDays(SCHEDULE_START, i);
    for (const t of CLASS_TEMPLATES) {
      if (!t.weekdays.includes(weekday(date))) continue;
      const id = `${t.slug}-${date}`;
      const filled = OTHER_BOOKED[id] ?? Math.floor(t.capacity * (0.35 + ((i * 7 + t.capacity) % 9) / 20));
      out.push([id, t.title, t.trainerId, t.room, toInstant(date, t.time), t.minutes, t.capacity, t.level, Math.min(filled, t.capacity - 1)]);
    }
  }
  return out;
}

/** จำนวนครั้งที่เข้ายิมต่อสัปดาห์ นับย้อนจากครั้งล่าสุด (ใช้คิดความเสี่ยงหลุด) */
const WEEKLY_VISITS = {
  '01': [4, 4, 5, 4, 4, 5, 4, 4], '02': [1, 1, 1, 2, 2, 3, 3, 3], '03': [3, 3, 4, 3, 3, 4, 3, 3], '04': [0, 2, 3, 3, 3, 3, 3, 3],
  '05': [1, 0, 1, 1, 2, 2, 3, 3], '06': [5, 5, 5, 6, 5, 5, 5, 5], '07': [1, 1, 1, 2, 3, 3, 4, 4], '08': [2, 1, 2, 2, 2, 2, 2, 2],
  '09': [1, 1, 1, 2, 3, 4, 4, 4], '10': [3, 4, 3, 3, 4, 3, 3, 3], '11': [4, 4, 4, 4, 4, 4, 4, 4], '12': [1],
};

function checkIns() {
  const today = [['c-1', '12', '2026-10-15T11:31:00Z', true], ['c-2', '11', '2026-10-15T11:33:00Z', true], ['c-3', '03', '2026-10-15T11:36:00Z', true], ['c-4', '05', '2026-10-15T11:39:00Z', false], ['c-5', '10', '2026-10-15T11:40:00Z', true], ['c-6', '01', '2026-10-15T11:42:00Z', true]];
  const history = [];
  for (const m of MEMBERS) {
    const last = Date.parse(m.lastCheckInAt);
    const isToday = today.some(c => c[1] === m.id);
    (WEEKLY_VISITS[m.id] ?? []).forEach((count, w) => {
      for (let k = 0; k < count; k++) {
        if (w === 0 && k === 0 && isToday) continue;
        history.push([`c-${m.id}-${w}-${k}`, m.id, new Date(last - (w * 7 + Math.floor((k * 7) / count)) * DAY).toISOString(), true]);
      }
    });
  }
  return [...history, ...today].map(([id, memberId, iso, allowed]) => [id, memberId, at(iso), allowed]);
}

const BOOKINGS = [
  ['b-1', 'hiit-2026-10-15', '01', '2026-10-14T02:00:00Z'], ['b-2', 'hiit-2026-10-15', '10', '2026-10-15T01:20:00Z'], ['b-3', 'yoga-flow-2026-10-15', '11', '2026-10-13T08:00:00Z'],
  ['b-4', 'spin-2026-10-15', '06', '2026-10-12T05:30:00Z'], ['b-5', 'body-pump-2026-10-16', '02', '2026-10-15T03:00:00Z'], ['b-6', 'bootcamp-2026-10-17', '01', '2026-10-15T04:10:00Z'], ['b-7', 'yoga-flow-2026-10-17', '11', '2026-10-15T04:12:00Z'],
];

const PT_SESSIONS = [
  ['pt-1', 't4', '03', '2026-10-13T10:00:00Z', 'done'], ['pt-2', 't4', '03', '2026-10-16T10:00:00Z', 'booked'], ['pt-3', 't1', '06', '2026-10-19T00:00:00Z', 'booked'], ['pt-4', 't4', '06', '2026-10-15T12:00:00Z', 'booked'],
];

/** [ลำดับใบเสร็จ, สมาชิก, แพ็กเกจ, ประเภท, ยอด, วิธีชำระ, สถานะ, เวลา, ช่วงสิทธิ์] */
const PAYMENTS = [
  [101, '10', 'monthly', 'renew', 120_000, 'promptpay', 'paid', '2026-10-10T04:12:00Z', ['2026-10-11', '2026-11-10']],
  [102, '06', 'pt10', 'pt', 900_000, 'card', 'paid', '2026-10-11T09:30:00Z', null],
  [103, '03', '3m', 'renew', 330_000, 'transfer', 'paid', '2026-10-12T03:45:00Z', null],
  [104, '11', '6m', 'renew', 600_000, 'card', 'paid', '2026-10-13T11:05:00Z', null],
  [105, '08', 'monthly', 'renew', 120_000, 'cash', 'paid', '2026-10-14T00:20:00Z', null],
  [106, '12', 'daypass', 'daypass', 20_000, 'cash', 'paid', '2026-10-15T11:30:00Z', ['2026-10-15', '2026-10-15']],
  [107, '07', '3m', 'renew', 330_000, 'promptpay', 'review', '2026-10-15T09:50:00Z', null],
  [108, '09', '6m', 'renew', 600_000, 'transfer', 'review', '2026-10-15T10:15:00Z', null],
  [109, '05', 'monthly', 'renew', 120_000, 'promptpay', 'pending', '2026-10-15T11:39:30Z', null],
];

const COUPONS = [
  { code: 'RENEW10', description: 'ต่ออายุก่อนหมด', type: 'percent', value: 10, kind: 'promo', packageIds: ['monthly', '3m', '6m'], renewOnly: true, newOnly: false, limit: 100, used: 46, expiresOn: '2026-12-31', ownerMemberId: null, createdAt: '2026-09-01T02:00:00Z' },
  { code: 'STUDENT', description: 'แสดงบัตรนักศึกษา', type: 'baht', value: 20_000, kind: 'promo', packageIds: null, renewOnly: false, newOnly: false, limit: 50, used: 36, expiresOn: '2027-03-31', ownerMemberId: null, createdAt: '2026-06-01T02:00:00Z' },
  { code: 'WELCOME7', description: 'สมาชิกใหม่ แถม 7 วัน', type: 'days', value: 7, kind: 'promo', packageIds: ['monthly', '3m', '6m', 'gold12'], renewOnly: false, newOnly: true, limit: null, used: 12, expiresOn: null, ownerMemberId: null, createdAt: '2026-08-01T02:00:00Z' },
  { code: 'OCT-FLASH', description: 'โปรสุดสัปดาห์', type: 'percent', value: 15, kind: 'promo', packageIds: null, renewOnly: false, newOnly: false, limit: 20, used: 20, expiresOn: '2026-10-12', ownerMemberId: null, createdAt: '2026-10-09T02:00:00Z' },
  { code: 'FRIEND-1842', description: 'ชวนเพื่อนของ พิมพ์ชนก ว.', type: 'baht', value: 20_000, kind: 'referral', packageIds: null, renewOnly: false, newOnly: true, limit: 10, used: 3, expiresOn: null, ownerMemberId: '02', createdAt: '2026-07-01T02:00:00Z' },
];

/** รอบแจ้งเตือนของข้อมูลตัวอย่าง (ผูกคูปอง RENEW10) */
const ROUND_COUPONS = {
  'before-3': ['สวัสดีคุณ{ชื่อ} สมาชิก{แพ็กเกจ}จะหมดอายุ {วันหมดอายุ} ต่ออายุตอนนี้ใช้โค้ด {คูปอง} ลด 10% กดจ่ายได้เลย {ลิงก์ชำระ}', 'RENEW10'],
  'after-7': ['คิดถึงคุณ{ชื่อ}นะ กลับมาเล่นกันเถอะ ใช้โค้ด {คูปอง} ได้ที่ {ลิงก์ชำระ}', 'RENEW10'],
};

/** [id, สมาชิก, รอบ, เวลาส่ง, คลิก, payment] */
const REMINDER_LOGS = [
  ['r-1', '10', 'before-3', '2026-10-07T02:00:00Z', true, 'p-101'], ['r-2', '05', 'before-3', '2026-10-06T02:00:00Z', false, null], ['r-3', '05', 'on-day', '2026-10-09T02:00:00Z', false, null],
  ['r-4', '08', 'before-7', '2026-10-13T02:00:00Z', true, null], ['r-5', '07', 'before-7', '2026-10-12T02:00:00Z', true, 'p-107'], ['r-6', '09', 'before-7', '2026-10-14T02:00:00Z', false, null], ['r-7', '02', 'before-7', '2026-10-11T02:00:00Z', false, null],
];

const DECLINED = 'บัตรถูกปฏิเสธ (วงเงินไม่พอ)';
const CHARGES = [
  ['ch-2', '09', '6m', 600_000, '2026-10-14', [{ on: '2026-10-14', ok: false, reason: DECLINED }], 'retrying'],
  ['ch-1', '05', 'monthly', 120_000, '2026-10-06', ['2026-10-06', '2026-10-07', '2026-10-09', '2026-10-11'].map(on => ({ on, ok: false, reason: DECLINED })), 'failed'],
];

const FOLLOW_UPS = [
  ['05', 'contacted', 'ติดงานต่างจังหวัด นัดกลับ 1 พ.ย.', 'ปริญญา ส.', '2026-10-12T05:00:00Z'],
  ['10', 'won', 'ต่ออายุรายเดือนจากลิงก์เตือน', 'มนัสนันท์ ร.', '2026-10-10T04:12:00Z'],
];

/* ---------- ใส่ลงฐานข้อมูล ---------- */

const TABLES = ['audit_logs', 'sessions', 'owner_branches', 'password_reset_requests', 'meal_logs', 'health_profiles', 'workout_plans', 'follow_ups', 'reminder_logs', 'charges', 'bookings', 'pt_sessions', 'check_ins', 'payments', 'coupons', 'classes', 'users', 'members', 'trainers', 'reminder_rounds', 'packages', 'counters'];

/** ลบข้อมูลทุกตาราง (ยกเว้นประวัติ migration) — audit_logs มี trigger กันลบ จึงใช้ TRUNCATE */
export async function wipe(conn) {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TABLES) await conn.query(`TRUNCATE TABLE \`${t}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function insert(conn, table, columns, rows) {
  if (rows.length === 0) return;
  const sql = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
  await conn.batch(sql, rows);
}

export async function loadSampleData(conn) {
  await seedBase(conn);
  const password = process.env.DEMO_PASSWORD ?? '1234';
  const now = new Date();
  await conn.query("UPDATE counters SET value = 2331 WHERE name = 'member'");
  await conn.query("UPDATE counters SET value = 109 WHERE name = 'receipt'");
  for (const [id, [template, coupon]] of Object.entries(ROUND_COUPONS)) await conn.query('UPDATE reminder_rounds SET template = ?, coupon_code = ? WHERE id = ?', [template, coupon, id]);

  await insert(conn, 'trainers', ['id', 'name', 'nickname', 'specialties', 'bio', 'color', 'created_at', 'updated_at'], TRAINERS.map((t, i) => [t.id, t.name, t.nickname, JSON.stringify(t.specialties), t.bio, t.color, new Date(Date.UTC(2023, 0, 1 + i)), now]));
  await insert(
    conn,
    'members',
    ['id', 'code', 'name', 'phone', 'email', 'joined_on', 'package_id', 'expires_on', 'freeze_from', 'freeze_until', 'pt_sessions_left', 'last_check_in_at', 'note', 'marketing_consent', 'card_brand', 'card_last4', 'card_exp', 'auto_renew_since', 'created_at', 'updated_at'],
    MEMBERS.map(m => {
      const card = AUTO_RENEW[m.id];
      return [m.id, m.code, m.name, m.phone, m.email, m.joinedOn, m.packageId, m.expiresOn, m.freeze?.[0] ?? null, m.freeze?.[1] ?? null, m.pt, at(m.lastCheckInAt), m.note, !NO_MARKETING.has(m.id), card?.[0] ?? null, card?.[1] ?? null, card?.[2] ?? null, card?.[3] ?? null, at(`${m.joinedOn}T03:00:00Z`), now];
    }),
  );
  await insert(conn, 'users', ['id', 'login', 'password_hash', 'role', 'name', 'nickname', 'branch', 'trainer_id', 'member_id', 'active', 'created_at', 'updated_at'], USERS.map(([id, login, name, nickname, role, trainerId, memberId]) => [id, login, hashPassword(password), role, name, nickname, BRANCH, trainerId, memberId, true, now, now]));
  await insert(conn, 'classes', ['id', 'title', 'trainer_id', 'room', 'starts_at', 'minutes', 'capacity', 'level', 'other_booked', 'created_at'], classes().map(c => [...c, now]));
  await insert(conn, 'check_ins', ['id', 'member_id', 'at', 'allowed'], checkIns());
  await insert(conn, 'bookings', ['id', 'class_id', 'member_id', 'status', 'created_at'], BOOKINGS.map(([id, classId, memberId, created]) => [id, classId, memberId, 'booked', at(created)]));
  await insert(conn, 'pt_sessions', ['id', 'trainer_id', 'member_id', 'starts_at', 'minutes', 'status', 'created_at'], PT_SESSIONS.map(([id, trainerId, memberId, starts, status]) => [id, trainerId, memberId, at(starts), 60, status, at(starts)]));
  await insert(
    conn,
    'payments',
    ['id', 'receipt_no', 'member_id', 'package_id', 'kind', 'amount_satang', 'method', 'status', 'created_at', 'paid_at', 'applied', 'coverage_from', 'coverage_to', 'received_by', 'list_price_satang', 'discount_satang', 'coupon_code', 'bonus_days'],
    PAYMENTS.map(([seq, memberId, packageId, kind, amount, method, status, created, coverage]) => {
      const paid = status === 'paid';
      return [`p-${seq}`, `RC-6910-${String(seq).padStart(4, '0')}`, memberId, packageId, kind, amount, method, status, at(created), paid ? at(created) : null, paid, coverage?.[0] ?? null, coverage?.[1] ?? null, paid ? 'มนัสนันท์ ร.' : null, amount, 0, null, 0];
    }),
  );
  await insert(
    conn,
    'coupons',
    ['code', 'description', 'type', 'value', 'kind', 'package_ids', 'renew_only', 'new_only', 'usage_limit', 'used', 'per_member', 'expires_on', 'active', 'owner_member_id', 'created_at'],
    COUPONS.map(c => [c.code, c.description, c.type, c.value, c.kind, c.packageIds ? JSON.stringify(c.packageIds) : null, c.renewOnly, c.newOnly, c.limit, c.used, 1, c.expiresOn, true, c.ownerMemberId, at(c.createdAt)]),
  );
  await insert(conn, 'reminder_logs', ['id', 'member_id', 'round_id', 'channels', 'sent_at', 'clicked', 'payment_id'], REMINDER_LOGS.map(([id, memberId, roundId, sent, clicked, paymentId]) => [id, memberId, roundId, JSON.stringify(roundId === 'before-7' ? ['line'] : ['line', 'sms']), at(sent), clicked, paymentId]));
  await insert(conn, 'charges', ['id', 'member_id', 'package_id', 'amount_satang', 'due_on', 'attempts', 'status', 'payment_id'], CHARGES.map(([id, memberId, packageId, amount, dueOn, attempts, status]) => [id, memberId, packageId, amount, dueOn, JSON.stringify(attempts), status, null]));
  await insert(conn, 'follow_ups', ['member_id', 'stage', 'note', 'by', 'updated_at'], FOLLOW_UPS.map(([memberId, stage, note, by, updated]) => [memberId, stage, note, by, at(updated)]));
  // สมาชิกตัวอย่าง (ณัฐพล) ยินยอมและกรอกข้อมูลร่างกายไว้แล้ว พร้อมบันทึกอาหาร 2 มื้อของวันที่ 15 ต.ค.
  await insert(conn, 'health_profiles', ['user_id', 'sex', 'birth_year', 'height_cm', 'weight_kg', 'goal', 'activity', 'consent_at', 'notice_version', 'updated_at'], [['member-01', 'male', 1994, 174, 78, 'lose', 'moderate', at('2026-10-01T03:00:00Z'), 'health-2026-10', at('2026-10-01T03:00:00Z')]]);
  await insert(conn, 'meal_logs', ['id', 'user_id', 'date', 'name', 'kcal', 'protein_g', 'carb_g', 'fat_g', 'logged_at'], [
    ['ml-1', 'member-01', '2026-10-15', 'ข้าวต้มไข่ + นมจืด', 380, 22, 48, 10, toInstant('2026-10-15', '07:30')],
    ['ml-2', 'member-01', '2026-10-15', 'ข้าวมันไก่ (ไก่ต้ม ไม่เอาหนัง)', 450, 32, 58, 9, toInstant('2026-10-15', '12:15')],
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const conn = await mariadb.createConnection(connectionConfig());
  try {
    await conn.beginTransaction();
    if (process.argv.includes('--reset')) await wipe(conn);
    await loadSampleData(conn);
    await conn.commit();
    console.log('ใส่ข้อมูลตัวอย่างเสร็จ — ตั้ง DEMO_CLOCK=on ใน .env เพื่อดูข้อมูลตามวันที่ตัวอย่าง (15 ต.ค. 2569)');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}
