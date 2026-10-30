// ข้อมูลตั้งต้นที่ระบบต้องมี: แพ็กเกจ · รอบแจ้งเตือนต่ออายุ · ตัวนับเลข · บัญชีเจ้าของและ admin
// รัน: pnpm db:seed (หรืออัตโนมัติหลัง prisma migrate dev) — รันซ้ำได้ ไม่สร้างข้อมูลซ้ำ ไม่ทับข้อมูลที่แก้แล้ว
//
// บัญชีเจ้าของ/admin ตั้งค่าใน .env:
//   SEED_OWNER_LOGIN=owner@fitflow.test   (อีเมล หรือรหัสพนักงาน เช่น tatar)
//   SEED_OWNER_PASSWORD=รหัสผ่านที่เดายาก
//   SEED_OWNER_NAME=ชื่อที่แสดง
//   SEED_ADMIN_LOGIN=admin@fitflow.test
//   SEED_ADMIN_PASSWORD=รหัสผ่านที่เดายาก
//   SEED_ADMIN_NAME=ชื่อที่แสดง
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import mariadb from 'mariadb';

const root = path.resolve(import.meta.dirname, '..');
for (const file of ['.env.local', '.env']) {
  if (existsSync(path.join(root, file))) process.loadEnvFile(path.join(root, file));
}

/** scrypt 'salt:hash' — ต้องตรงกับ src/api/lib/auth/auth/auth.accounts.ts */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export const PACKAGES = [
  { id: 'monthly', name: 'รายเดือน', kind: 'time', months: 1, priceSatang: 120_000, description: 'เข้าใช้ได้ทุกวัน 06:00–22:00 รวมคลาสกลุ่ม' },
  { id: '3m', name: '3 เดือน', kind: 'time', months: 3, priceSatang: 330_000, description: 'ประหยัดกว่ารายเดือน ฿300' },
  { id: '6m', name: '6 เดือน', kind: 'time', months: 6, priceSatang: 600_000, description: 'พักสมาชิกได้สูงสุด 60 วัน' },
  { id: 'gold12', name: 'Gold 12 เดือน', kind: 'time', months: 12, priceSatang: 1_090_000, description: 'คลาสไม่จำกัด + ล็อกเกอร์ส่วนตัว' },
  { id: 'pt10', name: 'PT 10 ครั้ง', kind: 'pt', sessions: 10, priceSatang: 900_000, description: 'เทรนเนอร์ส่วนตัว ครั้งละ 60 นาที' },
  { id: 'daypass', name: 'Day pass', kind: 'daypass', days: 1, priceSatang: 20_000, description: 'เข้าใช้ได้ 1 วัน' },
];

export const REMINDER_ROUNDS = [
  { id: 'before-7', offsetDays: -7, enabled: true, channels: ['line'], template: 'สวัสดีคุณ{ชื่อ} สมาชิก{แพ็กเกจ}จะหมดอายุ {วันหมดอายุ} ต่ออายุได้เลยที่ {ลิงก์ชำระ}', couponCode: null },
  { id: 'before-3', offsetDays: -3, enabled: true, channels: ['line', 'sms'], template: 'สวัสดีคุณ{ชื่อ} สมาชิก{แพ็กเกจ}จะหมดอายุ {วันหมดอายุ} ต่ออายุได้เลยที่ {ลิงก์ชำระ}', couponCode: null },
  { id: 'on-day', offsetDays: 0, enabled: true, channels: ['line', 'sms'], template: 'คุณ{ชื่อ} สมาชิกหมดอายุวันนี้ ({วันหมดอายุ}) ต่ออายุก่อนเข้ายิมครั้งถัดไปได้ที่ {ลิงก์ชำระ}', couponCode: null },
  { id: 'after-7', offsetDays: 7, enabled: false, channels: ['line'], template: 'คิดถึงคุณ{ชื่อ}นะ กลับมาเล่นกันเถอะ ต่ออายุได้ที่ {ลิงก์ชำระ}', couponCode: null },
];

/** แปลง mysql://user:pass@host:port/db เป็นค่าตั้งของ mariadb */
export function connectionConfig(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('ยังไม่ได้ตั้ง DATABASE_URL ใน .env');
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    // เก็บ/อ่านเวลาเป็น UTC เหมือน Prisma
    timezone: 'Z',
  };
}

export async function seedBase(conn) {
  for (const [i, p] of PACKAGES.entries()) {
    await conn.query(
      'INSERT IGNORE INTO packages (id, name, kind, months, days, sessions, price_satang, description, active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(3), NOW(3))',
      [p.id, p.name, p.kind, p.months ?? null, p.days ?? null, p.sessions ?? null, p.priceSatang, p.description, i],
    );
  }
  for (const r of REMINDER_ROUNDS) {
    await conn.query('INSERT IGNORE INTO reminder_rounds (id, offset_days, enabled, channels, template, coupon_code) VALUES (?, ?, ?, ?, ?, ?)', [r.id, r.offsetDays, r.enabled, JSON.stringify(r.channels), r.template, r.couponCode]);
  }
  await conn.query("INSERT IGNORE INTO counters (name, value) VALUES ('member', 0), ('receipt', 0)");
}

async function seedAccount(conn, role, prefix, defaultName) {
  const login = (process.env[`${prefix}_LOGIN`] ?? '').trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`] ?? '';
  if (!login || !password) {
    console.log(`ข้ามการสร้างบัญชี ${role} — ตั้ง ${prefix}_LOGIN และ ${prefix}_PASSWORD ใน .env แล้วรันใหม่`);
    return;
  }
  if (password.length < 8) throw new Error(`${prefix}_PASSWORD ต้องยาวอย่างน้อย 8 ตัวอักษร`);
  const [existing] = await conn.query('SELECT id FROM users WHERE login = ?', [login]);
  if (existing) {
    console.log(`มีบัญชี ${login} อยู่แล้ว — ไม่เปลี่ยนรหัสผ่าน`);
    return;
  }
  const name = process.env[`${prefix}_NAME`] ?? defaultName;
  await conn.query(
    'INSERT INTO users (id, login, password_hash, role, name, nickname, branch, active, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3))',
    [login, hashPassword(password), role, name, name.split(' ')[0], process.env.SHOP_BRANCH ?? 'สาขาหลัก'],
  );
  console.log(`สร้างบัญชี ${role} ${login} แล้ว`);
}

async function seedOwner(conn) {
  await seedAccount(conn, 'owner', 'SEED_OWNER', 'เจ้าของ');
}

export async function seedAdmin(conn) {
  await seedAccount(conn, 'admin', 'SEED_ADMIN', 'ผู้ดูแลระบบ');
}

// รันโดยตรง (ไม่ใช่ถูก import จาก sample-data.mjs)
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const conn = await mariadb.createConnection(connectionConfig());
  try {
    await seedBase(conn);
    await seedOwner(conn);
    await seedAdmin(conn);
    console.log('seed ข้อมูลตั้งต้นเสร็จ');
  } finally {
    await conn.end();
  }
}
