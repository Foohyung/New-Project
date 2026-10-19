import 'server-only';
import type { MeterReading, Rates } from '@/features/billing/service';
import type { RoomStatus } from '@/features/rooms/types';

// ข้อมูลตัวอย่างระยะที่ 1 (ชื่อและเบอร์โทรเป็นข้อมูลสมมติ) — ระยะที่ 2 ย้ายไป PostgreSQL ผ่าน Prisma

export const RATES: Rates = { electricPerUnit: 800, waterPerUnit: 1800, waterMinimum: 10_000, commonFee: 30_000 };
export const BILLING_MONTH = 'ต.ค. 2569';
export const DUE_ON = '2026-10-05';

export interface RoomRecord {
  no: number;
  floor: number;
  rent: number;
  status: RoomStatus;
  tenant: { nickname: string; name: string; phone: string; moveInOn: string } | null;
  electric: MeterReading | null;
  water: MeterReading | null;
  paidAt: string | null;
  repairTicket: string | null;
  repairNote: string | null;
}

const VACANT = [103, 214, 309, 416];
const REPAIR = [211, 408];
const OVERDUE = [106, 202, 313, 405, 412];
const SLIP = [105, 207, 301, 415];
const NICKS = ['ต้น', 'แบงค์', 'มิ้นท์', 'ฝน', 'บอล', 'เมย์', 'กอล์ฟ', 'แพรว', 'บีม', 'ปุ๊ก', 'โอ๊ต', 'น้ำ', 'ฟ้า', 'เจมส์', 'ตาล', 'ปอนด์', 'ขิม', 'ภูมิ'];
const SURNAMES = ['ใจดี', 'สุขสันต์', 'มั่นคง', 'รุ่งเรือง', 'ศรีสวัสดิ์', 'บุญมา', 'ทองดี', 'แสงจันทร์'];
const TICKETS: Record<number, string> = { 304: 'แอร์ไม่เย็น (ด่วน)', 210: 'ก๊อกน้ำรั่ว' };

function statusOf(no: number): RoomStatus {
  if (VACANT.includes(no)) return 'vacant';
  if (REPAIR.includes(no)) return 'repair';
  if (OVERDUE.includes(no)) return 'overdue';
  if (SLIP.includes(no)) return 'slip';
  return 'paid';
}

function reading(no: number, salt: number, min: number, spread: number): MeterReading {
  const previous = ((no * salt) % 8000) + 500;
  return { previous, current: previous + min + ((no * (salt + 6)) % spread) };
}

export const rooms: RoomRecord[] = [];
for (let floor = 1; floor <= 4; floor++) {
  for (let r = 1; r <= 16; r++) {
    const no = floor * 100 + r;
    const status = statusOf(no);
    const occupied = status !== 'vacant' && status !== 'repair';
    const nickname = NICKS[(no * 7) % NICKS.length] ?? 'ผู้เช่า';
    let electric = occupied ? reading(no, 53, 80, 180) : null;
    let water = occupied ? reading(no, 11, 3, 10) : null;
    // ห้องตัวอย่างที่ใช้อธิบายในเอกสาร: 304 = บิล ฿6,064, 207 = มิเตอร์ไฟวนรอบ 342 หน่วย
    if (no === 304) { electric = { previous: 1200, current: 1382 }; water = { previous: 310, current: 316 }; }
    if (no === 207) { electric = { previous: 9950, current: 292 }; water = { previous: 402, current: 410 }; }
    rooms.push({
      no,
      floor,
      rent: floor <= 2 ? 380_000 : 420_000,
      status,
      tenant: occupied
        ? { nickname, name: `${nickname === 'ผู้เช่า' ? 'ผู้เช่า' : 'คุณ' + nickname} ${SURNAMES[no % SURNAMES.length] ?? ''}`.trim(), phone: `08000${String(no).padStart(5, '0')}`, moveInOn: `202${4 + (no % 2)}-0${1 + (no % 9)}-01` }
        : null,
      electric,
      water,
      paidAt: status === 'paid' ? `2026-10-${String(1 + (no % 14)).padStart(2, '0')}T0${(no % 9) + 1}:15:00Z` : null,
      repairTicket: TICKETS[no] ?? null,
      repairNote: status === 'repair' ? 'ปรับปรุงห้องน้ำ ถึง 31 ต.ค.' : null,
    });
  }
}

export const todos = [
  { id: 't1', title: 'ตรวจสลิป 4 รายการ', note: 'ห้อง 105, 207, 301, 415', done: false },
  { id: 't2', title: 'ติดตามค้างชำระ 5 ห้อง', note: '106, 202, 313, 405, 412', done: false },
  { id: 't3', title: 'นัดช่างแอร์ ห้อง 304', note: 'ผู้เช่าแจ้งเมื่อ 10:05 · ด่วน', done: false },
  { id: 't4', title: 'ทำสัญญาผู้เช่าใหม่ ห้อง 214', note: 'เข้าอยู่พรุ่งนี้ 16 ต.ค.', done: false },
  { id: 't5', title: 'ส่งบิลรอบ ต.ค. ทาง LINE', note: 'ส่งครบทุกห้องแล้ว', done: true },
];
