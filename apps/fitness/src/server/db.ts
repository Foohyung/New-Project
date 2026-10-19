import 'server-only';
import { addDays } from '@repo/utils';

/*
 * Backend จำลอง (mock) — เก็บข้อมูลในหน่วยความจำของ server
 * ระยะที่ 2 แทนไฟล์นี้ด้วย Prisma + PostgreSQL โดยให้ DAL ใน server/dal คง signature เดิม
 * ข้อมูลรีเซ็ตเมื่อรีสตาร์ท server หรือกด "รีเซ็ตข้อมูลตัวอย่าง" · ชื่อและเบอร์โทรทั้งหมดเป็นข้อมูลสมมติ
 */

export type PackageKind = 'time' | 'pt' | 'daypass';

export interface PackageRecord {
  id: string;
  name: string;
  kind: PackageKind;
  /** แพ็กเกจรายเดือน (kind = time) */
  months?: number;
  /** แพ็กเกจรายวัน (kind = daypass) */
  days?: number;
  /** จำนวนครั้ง PT (kind = pt) */
  sessions?: number;
  priceSatang: number;
  description: string;
  active: boolean;
}

export interface MemberRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  joinedOn: string;
  packageId: string;
  expiresOn: string;
  /** ช่วงพักสมาชิก (วันสุดท้ายของการพัก = until) */
  freeze: { from: string; until: string } | null;
  ptSessionsLeft: number;
  lastCheckInAt: string | null;
  note: string | null;
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  at: string;
  allowed: boolean;
}

export interface TrainerRecord {
  id: string;
  name: string;
  nickname: string;
  specialties: string[];
  bio: string;
  color: string;
}

export interface ClassRecord {
  id: string;
  title: string;
  trainerId: string;
  room: string;
  startsAt: string;
  minutes: number;
  capacity: number;
  level: 'ง่าย' | 'กลาง' | 'หนัก';
  /** ผู้จองที่เป็นสมาชิกนอกชุดข้อมูลตัวอย่าง (แทนสมาชิกทั้งยิม 1,248 คน) */
  otherBooked: number;
}

export interface BookingRecord {
  id: string;
  classId: string;
  memberId: string;
  createdAt: string;
  status: 'booked' | 'cancelled';
}

export interface PtSessionRecord {
  id: string;
  trainerId: string;
  memberId: string;
  startsAt: string;
  minutes: number;
  status: 'booked' | 'done' | 'cancelled';
}

export type PaymentMethod = 'promptpay' | 'card' | 'cash' | 'transfer';
/** pending = รอชำระ · review = แนบสลิปแล้ว รอตรวจ · paid = ชำระแล้ว */
export type PaymentStatus = 'pending' | 'review' | 'paid';

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  memberId: string;
  packageId: string;
  kind: 'signup' | 'renew' | 'pt' | 'daypass';
  amountSatang: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  /** ผลของการชำระ (ต่ออายุ / เพิ่มครั้ง PT) ถูกใช้ไปแล้วหรือยัง */
  applied: boolean;
  /** ช่วงสิทธิ์ที่ได้จากการชำระ (แพ็กเกจรายเดือน/รายวัน) — บันทึกตอนชำระสำเร็จเพื่อพิมพ์ในใบเสร็จ */
  coverage: { from: string; to: string } | null;
  /** เจ้าหน้าที่ที่รับเงิน/ยืนยันสลิป */
  receivedBy: string | null;
  /** ข้อมูลตั้งต้น — รวมอยู่ในยอดสรุปของแดชบอร์ดแล้ว */
  seeded: boolean;
}

export interface Store {
  packages: PackageRecord[];
  members: MemberRecord[];
  checkIns: CheckInRecord[];
  trainers: TrainerRecord[];
  classes: ClassRecord[];
  bookings: BookingRecord[];
  ptSessions: PtSessionRecord[];
  payments: PaymentRecord[];
  sequence: { member: number; receipt: number };
}

/* ---------- ข้อมูลตั้งต้น ---------- */

const PACKAGES: PackageRecord[] = [
  { id: 'monthly', name: 'รายเดือน', kind: 'time', months: 1, priceSatang: 120_000, description: 'เข้าใช้ได้ทุกวัน 06:00–22:00 รวมคลาสกลุ่ม', active: true },
  { id: '3m', name: '3 เดือน', kind: 'time', months: 3, priceSatang: 330_000, description: 'ประหยัดกว่ารายเดือน ฿300', active: true },
  { id: '6m', name: '6 เดือน', kind: 'time', months: 6, priceSatang: 600_000, description: 'พักสมาชิกได้สูงสุด 60 วัน', active: true },
  { id: 'gold12', name: 'Gold 12 เดือน', kind: 'time', months: 12, priceSatang: 1_090_000, description: 'คลาสไม่จำกัด + ล็อกเกอร์ส่วนตัว', active: true },
  { id: 'pt10', name: 'PT 10 ครั้ง', kind: 'pt', sessions: 10, priceSatang: 900_000, description: 'เทรนเนอร์ส่วนตัว ครั้งละ 60 นาที', active: true },
  { id: 'daypass', name: 'Day pass', kind: 'daypass', days: 1, priceSatang: 20_000, description: 'เข้าใช้ได้ 1 วัน', active: true },
];

const MEMBERS: MemberRecord[] = [
  { id: '01', code: 'FF-002318', name: 'ณัฐพล ศรีสุข', phone: '0800000101', email: 'nattapol@example.com', joinedOn: '2024-08-13', packageId: 'gold12', expiresOn: '2027-08-12', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-15T11:42:00Z', note: null },
  { id: '02', code: 'FF-001842', name: 'พิมพ์ชนก วงศ์ดี', phone: '0800000102', email: null, joinedOn: '2025-06-19', packageId: 'monthly', expiresOn: '2026-10-18', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-14T12:10:00Z', note: null },
  { id: '03', code: 'FF-002107', name: 'ธนกร แก้วมณี', phone: '0800000103', email: 'thanakorn@example.com', joinedOn: '2025-12-01', packageId: '3m', expiresOn: '2026-11-30', freeze: null, ptSessionsLeft: 3, lastCheckInAt: '2026-10-15T11:36:00Z', note: 'เป้าหมาย: ลดไขมัน 5 กก.' },
  { id: '04', code: 'FF-001377', name: 'กมลชนก อินทร์แก้ว', phone: '0800000104', email: null, joinedOn: '2025-07-03', packageId: '6m', expiresOn: '2027-01-02', freeze: { from: '2026-10-01', until: '2026-11-14' }, ptSessionsLeft: 0, lastCheckInAt: '2026-09-30T00:20:00Z', note: 'พักสมาชิก: เดินทางต่างประเทศ' },
  { id: '05', code: 'FF-002251', name: 'วรเมธ พูลผล', phone: '0800000105', email: null, joinedOn: '2026-03-10', packageId: 'monthly', expiresOn: '2026-10-09', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-03T13:05:00Z', note: null },
  { id: '06', code: 'FF-000958', name: 'ศิริพร ทองคำ', phone: '0800000106', email: 'siriporn@example.com', joinedOn: '2023-03-22', packageId: 'gold12', expiresOn: '2027-03-21', freeze: null, ptSessionsLeft: 5, lastCheckInAt: '2026-10-14T23:48:00Z', note: null },
  { id: '07', code: 'FF-001603', name: 'สุรเชษฐ์ นาคสวัสดิ์', phone: '0800000107', email: null, joinedOn: '2025-10-20', packageId: '3m', expiresOn: '2026-10-19', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-13T11:00:00Z', note: null },
  { id: '08', code: 'FF-002034', name: 'จิราภรณ์ แสงทอง', phone: '0800000108', email: null, joinedOn: '2026-01-21', packageId: 'monthly', expiresOn: '2026-10-20', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-15T00:15:00Z', note: null },
  { id: '09', code: 'FF-001128', name: 'ภาคิน รัตนวงศ์', phone: '0800000109', email: null, joinedOn: '2025-04-22', packageId: '6m', expiresOn: '2026-10-21', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-11T10:30:00Z', note: null },
  { id: '10', code: 'FF-002290', name: 'อรวรรณ มีสุข', phone: '0800000110', email: null, joinedOn: '2026-07-11', packageId: 'monthly', expiresOn: '2026-11-10', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-15T11:40:00Z', note: null },
  { id: '11', code: 'FF-001955', name: 'ปวีณา ชัยมงคล', phone: '0800000111', email: 'paweena@example.com', joinedOn: '2025-08-15', packageId: '6m', expiresOn: '2027-02-14', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-15T11:33:00Z', note: null },
  { id: '12', code: 'FF-002330', name: 'เอกชัย บุญมา', phone: '0800000112', email: null, joinedOn: '2026-10-15', packageId: 'daypass', expiresOn: '2026-10-15', freeze: null, ptSessionsLeft: 0, lastCheckInAt: '2026-10-15T11:31:00Z', note: null },
];

const TRAINERS: TrainerRecord[] = [
  { id: 't1', name: 'ณัฐวุฒิ บุญเลิศ', nickname: 'โค้ชบอส', specialties: ['HIIT', 'Functional'], bio: 'อดีตนักกีฬาฟุตบอล เน้นความฟิตและการเผาผลาญ', color: 'var(--color-lime)' },
  { id: 't2', name: 'พิชญา สายทอง', nickname: 'ครูแพร', specialties: ['Yoga', 'Pilates'], bio: 'ครูโยคะ RYT-500 ดูแลเรื่องความยืดหยุ่นและแกนกลางลำตัว', color: 'var(--color-violet)' },
  { id: 't3', name: 'จิรายุ ทองดี', nickname: 'โค้ชเจ', specialties: ['Spin', 'Cardio'], bio: 'นักปั่นจักรยานสมัครเล่น ชอบเพลงมันส์และคลาสพลังสูง', color: 'var(--color-cyan)' },
  { id: 't4', name: 'ศุภกร ใจงาม', nickname: 'โค้ชมิว', specialties: ['เวทเทรนนิ่ง', 'Body composition'], bio: 'เทรนเนอร์ส่วนตัว 8 ปี ดูแลโปรแกรมเพิ่มกล้ามและลดไขมัน', color: 'var(--color-warn)' },
];

interface ClassTemplate { slug: string; title: string; trainerId: string; room: string; time: string; minutes: number; capacity: number; level: ClassRecord['level']; weekdays: number[] }

const CLASS_TEMPLATES: ClassTemplate[] = [
  { slug: 'morning-yoga', title: 'Morning Yoga', trainerId: 't2', room: 'ห้อง B', time: '07:00', minutes: 60, capacity: 20, level: 'ง่าย', weekdays: [1, 2, 3, 4, 5] },
  { slug: 'body-pump', title: 'Body Pump', trainerId: 't4', room: 'ห้อง A', time: '12:00', minutes: 50, capacity: 22, level: 'กลาง', weekdays: [1, 3, 5] },
  { slug: 'hiit', title: 'HIIT Burn', trainerId: 't1', room: 'ห้อง A', time: '18:00', minutes: 45, capacity: 25, level: 'หนัก', weekdays: [1, 2, 3, 4, 5] },
  { slug: 'yoga-flow', title: 'Yoga Flow', trainerId: 't2', room: 'ห้อง B', time: '19:00', minutes: 60, capacity: 20, level: 'ง่าย', weekdays: [2, 4, 6] },
  { slug: 'spin', title: 'Spin Power', trainerId: 't3', room: 'ห้อง Spin', time: '20:00', minutes: 45, capacity: 20, level: 'หนัก', weekdays: [1, 3, 4, 5] },
  { slug: 'bootcamp', title: 'Weekend Bootcamp', trainerId: 't1', room: 'ลานกลางแจ้ง', time: '09:00', minutes: 60, capacity: 30, level: 'หนัก', weekdays: [6, 0] },
  { slug: 'pilates', title: 'Pilates Core', trainerId: 't2', room: 'ห้อง B', time: '10:00', minutes: 50, capacity: 15, level: 'กลาง', weekdays: [6, 0] },
];

/** วันแรกของตารางคลาสตัวอย่าง (ตรงกับเวลาตรึงของระบบ) */
const SCHEDULE_START = '2026-10-12';
const SCHEDULE_DAYS = 21;

/** ผู้จองจากสมาชิกนอกชุดข้อมูล — คลาสวันนี้ตั้งให้ตรงกับ design (HIIT 24/25, Yoga 12/20, Spin เต็ม) */
const OTHER_BOOKED: Record<string, number> = { 'hiit-2026-10-15': 22, 'yoga-flow-2026-10-15': 11, 'spin-2026-10-15': 19 };

const toInstant = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function seedClasses(): ClassRecord[] {
  const result: ClassRecord[] = [];
  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const date = addDays(SCHEDULE_START, i);
    for (const t of CLASS_TEMPLATES) {
      if (!t.weekdays.includes(weekday(date))) continue;
      const id = `${t.slug}-${date}`;
      // ตัวเลขผู้จองแบบคงที่ (deterministic) ให้แต่ละคลาสดูต่างกัน
      const filled = OTHER_BOOKED[id] ?? Math.floor(t.capacity * (0.35 + ((i * 7 + t.capacity) % 9) / 20));
      result.push({ id, title: t.title, trainerId: t.trainerId, room: t.room, startsAt: toInstant(date, t.time), minutes: t.minutes, capacity: t.capacity, level: t.level, otherBooked: Math.min(filled, t.capacity - 1) });
    }
  }
  return result;
}

function seedCheckIns(): CheckInRecord[] {
  const today: CheckInRecord[] = [
    { id: 'c-1', memberId: '12', at: '2026-10-15T11:31:00Z', allowed: true },
    { id: 'c-2', memberId: '11', at: '2026-10-15T11:33:00Z', allowed: true },
    { id: 'c-3', memberId: '03', at: '2026-10-15T11:36:00Z', allowed: true },
    { id: 'c-4', memberId: '05', at: '2026-10-15T11:39:00Z', allowed: false },
    { id: 'c-5', memberId: '10', at: '2026-10-15T11:40:00Z', allowed: true },
    { id: 'c-6', memberId: '01', at: '2026-10-15T11:42:00Z', allowed: true },
  ];
  // ประวัติย้อนหลังของสมาชิกแต่ละคน (ทุก 2–3 วันจากการเข้ายิมครั้งล่าสุด)
  const history: CheckInRecord[] = [];
  for (const m of MEMBERS) {
    if (!m.lastCheckInAt) continue;
    const last = new Date(m.lastCheckInAt);
    const isToday = today.some(c => c.memberId === m.id);
    for (let k = isToday ? 1 : 0; k < 8; k++) {
      const at = new Date(last.getTime() - k * (2 + (Number(m.id) % 2)) * 86_400_000);
      history.push({ id: `c-${m.id}-${String(k)}`, memberId: m.id, at: at.toISOString(), allowed: true });
    }
  }
  return [...history, ...today];
}

const BOOKINGS: BookingRecord[] = [
  { id: 'b-1', classId: 'hiit-2026-10-15', memberId: '01', createdAt: '2026-10-14T02:00:00Z', status: 'booked' },
  { id: 'b-2', classId: 'hiit-2026-10-15', memberId: '10', createdAt: '2026-10-15T01:20:00Z', status: 'booked' },
  { id: 'b-3', classId: 'yoga-flow-2026-10-15', memberId: '11', createdAt: '2026-10-13T08:00:00Z', status: 'booked' },
  { id: 'b-4', classId: 'spin-2026-10-15', memberId: '06', createdAt: '2026-10-12T05:30:00Z', status: 'booked' },
  { id: 'b-5', classId: 'body-pump-2026-10-16', memberId: '02', createdAt: '2026-10-15T03:00:00Z', status: 'booked' },
  { id: 'b-6', classId: 'bootcamp-2026-10-17', memberId: '01', createdAt: '2026-10-15T04:10:00Z', status: 'booked' },
  { id: 'b-7', classId: 'yoga-flow-2026-10-17', memberId: '11', createdAt: '2026-10-15T04:12:00Z', status: 'booked' },
];

const PT_SESSIONS: PtSessionRecord[] = [
  { id: 'pt-1', trainerId: 't4', memberId: '03', startsAt: '2026-10-13T10:00:00Z', minutes: 60, status: 'done' },
  { id: 'pt-2', trainerId: 't4', memberId: '03', startsAt: '2026-10-16T10:00:00Z', minutes: 60, status: 'booked' },
  { id: 'pt-3', trainerId: 't1', memberId: '06', startsAt: '2026-10-19T00:00:00Z', minutes: 60, status: 'booked' },
  { id: 'pt-4', trainerId: 't4', memberId: '06', startsAt: '2026-10-15T12:00:00Z', minutes: 60, status: 'booked' },
];

function payment(seq: number, memberId: string, packageId: string, kind: PaymentRecord['kind'], amountSatang: number, method: PaymentMethod, status: PaymentStatus, createdAt: string, coverage: PaymentRecord['coverage'] = null): PaymentRecord {
  return { id: `p-${String(seq)}`, receiptNo: `RC-6910-${String(seq).padStart(4, '0')}`, memberId, packageId, kind, amountSatang, method, status, createdAt, paidAt: status === 'paid' ? createdAt : null, applied: status === 'paid', coverage, receivedBy: status === 'paid' ? 'มนัสนันท์ ร.' : null, seeded: true };
}

const PAYMENTS: PaymentRecord[] = [
  payment(101, '10', 'monthly', 'renew', 120_000, 'promptpay', 'paid', '2026-10-10T04:12:00Z', { from: '2026-10-11', to: '2026-11-10' }),
  payment(102, '06', 'pt10', 'pt', 900_000, 'card', 'paid', '2026-10-11T09:30:00Z'),
  payment(103, '03', '3m', 'renew', 330_000, 'transfer', 'paid', '2026-10-12T03:45:00Z'),
  payment(104, '11', '6m', 'renew', 600_000, 'card', 'paid', '2026-10-13T11:05:00Z'),
  payment(105, '08', 'monthly', 'renew', 120_000, 'cash', 'paid', '2026-10-14T00:20:00Z'),
  payment(106, '12', 'daypass', 'daypass', 20_000, 'cash', 'paid', '2026-10-15T11:30:00Z', { from: '2026-10-15', to: '2026-10-15' }),
  payment(107, '07', '3m', 'renew', 330_000, 'promptpay', 'review', '2026-10-15T09:50:00Z'),
  payment(108, '09', '6m', 'renew', 600_000, 'transfer', 'review', '2026-10-15T10:15:00Z'),
  payment(109, '05', 'monthly', 'renew', 120_000, 'promptpay', 'pending', '2026-10-15T11:39:30Z'),
];

function createStore(): Store {
  return {
    packages: structuredClone(PACKAGES),
    members: structuredClone(MEMBERS),
    checkIns: seedCheckIns(),
    trainers: structuredClone(TRAINERS),
    classes: seedClasses(),
    bookings: structuredClone(BOOKINGS),
    ptSessions: structuredClone(PT_SESSIONS),
    payments: structuredClone(PAYMENTS),
    sequence: { member: 2331, receipt: 109 },
  };
}

/* เก็บไว้บน globalThis เพื่อไม่ให้ข้อมูลหายตอน hot reload ระหว่างพัฒนา */
const holder = globalThis as unknown as { __fitflowStore?: Store };

export function db(): Store {
  holder.__fitflowStore ??= createStore();
  return holder.__fitflowStore;
}

export function resetStore(): void {
  holder.__fitflowStore = createStore();
}

export function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** รายได้เดือน ต.ค. 2569 ถึงวันที่ 15 (สตางค์) */
const OCTOBER_REVENUE = 41_235_000;

/* ---------- ตัวเลขสรุปของทั้งยิม (สมาชิกจริงมี 1,248 คน — ชุดข้อมูลรายคนมีแค่ตัวอย่าง) ---------- */
export const BASELINE = {
  inGym: { now: 47, capacity: 120, zones: [{ name: 'เวท', count: 21 }, { name: 'คาร์ดิโอ', count: 14 }, { name: 'ห้องคลาส', count: 12 }] },
  checkInsToday: 186,
  checkInsChangePct: 12,
  activeMembers: 1248,
  newThisMonth: 32,
  renewalsThisMonth: 118,
  lapsedThisMonth: 21,
  revenueMonthSatang: OCTOBER_REVENUE,
  revenueChangePct: 8.6,
  /** [ชั่วโมง, เช็กอินแล้ว, คาดการณ์ (เฉพาะชั่วโมงปัจจุบันและอนาคต)] */
  hourly: [
    [6, 9], [7, 24], [8, 19], [9, 11], [10, 8], [11, 7], [12, 15], [13, 10], [14, 7],
    [15, 9], [16, 17], [17, 33], [18, 17, 41], [19, 0, 38], [20, 0, 27], [21, 0, 15], [22, 0, 6],
  ] as [number, number, number?][],
  currentHour: 18,
  packageMix: [
    { name: 'รายเดือน', count: 524, color: 'var(--color-cyan)' },
    { name: 'Gold 12 เดือน', count: 337, color: 'var(--color-warn)' },
    { name: '6 เดือน', count: 287, color: 'var(--color-lime)' },
    { name: 'PT / แพ็กคลาส', count: 100, color: 'var(--color-violet)' },
  ],
  /** รายได้รายวัน 16 ก.ย. – 15 ต.ค. 2569 (สตางค์) — รวมเดือน ต.ค. = revenueMonthSatang */
  dailyRevenue: buildDailyRevenue(),
  /** เช็กอินรายวัน 2–15 ต.ค. 2569 */
  dailyCheckIns: [171, 158, 122, 198, 205, 189, 176, 168, 131, 117, 201, 212, 194, 186].map((count, i) => ({ date: addDays('2026-10-02', i), count })),
};

function buildDailyRevenue(): { date: string; satang: number }[] {
  const days: string[] = Array.from({ length: 30 }, (_, i) => addDays('2026-09-16', i));
  // วันเสาร์-อาทิตย์และต้นเดือนมีคนต่ออายุมากกว่า
  const weight = (date: string, i: number) => (weekday(date) === 0 || weekday(date) === 6 ? 1.35 : 1) * (date.endsWith('-01') || date.endsWith('-02') ? 1.6 : 1) * (0.85 + ((i * 37) % 11) / 30);
  const october = days.filter(d => d >= '2026-10-01');
  const septTotal = 38_120_000;
  const sept = days.filter(d => d < '2026-10-01');
  const spread = (list: string[], total: number) => {
    const w = list.map(d => weight(d, days.indexOf(d)));
    const sum = w.reduce((a, b) => a + b, 0);
    const values = w.map(x => Math.round((total * x) / sum / 100) * 100);
    values[values.length - 1] = (values.at(-1) ?? 0) + total - values.reduce((a, b) => a + b, 0);
    return list.map((date, i) => ({ date, satang: values[i] ?? 0 }));
  };
  // ส่วนของ ก.ย. คิดเฉพาะ 15 วันสุดท้ายของเดือน (ครึ่งหนึ่งของยอดทั้งเดือนโดยประมาณ)
  return [...spread(sept, septTotal / 2), ...spread(october, OCTOBER_REVENUE)];
}

