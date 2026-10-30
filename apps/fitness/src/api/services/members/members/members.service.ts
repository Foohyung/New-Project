import { addDays, daysBetween } from '@/api/lib/utils/utils/utils';

export type MembershipStatus = 'active' | 'expiring' | 'expired' | 'frozen';

export interface MembershipLike {
  /** วันหมดอายุ YYYY-MM-DD (ใช้ได้ถึงสิ้นวันนั้น) */
  expiresOn: string;
  frozen: boolean;
}

/** แจ้งเตือนเมื่อเหลือไม่เกินกี่วัน */
export const EXPIRING_WITHIN_DAYS = 7;

/** จำนวนวันที่ยังใช้สิทธิ์ได้ (0 = วันสุดท้าย, ติดลบ = หมดอายุแล้ว) */
export function daysLeft(member: MembershipLike, today: string): number {
  return daysBetween(today, member.expiresOn);
}

export function membershipStatus(member: MembershipLike, today: string): MembershipStatus {
  if (member.frozen) return 'frozen';
  const left = daysLeft(member, today);
  if (left < 0) return 'expired';
  if (left <= EXPIRING_WITHIN_DAYS) return 'expiring';
  return 'active';
}

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'ใช้งาน',
  expiring: 'ใกล้หมดอายุ',
  expired: 'หมดอายุ',
  frozen: 'พักสมาชิก',
};

/* ---------- ระยะเวลาแพ็กเกจ ---------- */

/** บวกเดือน โดยวันที่เกินสิ้นเดือนจะถูกปัดเป็นวันสุดท้ายของเดือน (31 ม.ค. + 1 เดือน = 28/29 ก.พ.) */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export interface PackageLike {
  kind: 'time' | 'pt' | 'daypass';
  months?: number;
  days?: number;
  sessions?: number;
}

/**
 * ช่วงสิทธิ์ใหม่หลังซื้อแพ็กเกจ (A.1 ต่ออายุ)
 * - ยังไม่หมดอายุ: ต่อจากวันหมดอายุเดิม ไม่เสียวันที่เหลือ
 * - หมดอายุแล้วหรือสมัครใหม่: เริ่มนับวันนี้
 * แพ็กเกจ PT ไม่เปลี่ยนวันหมดอายุ (คืน null)
 */
export function membershipPeriod(pkg: PackageLike, currentExpiresOn: string | null, today: string): { startsOn: string; expiresOn: string } | null {
  if (pkg.kind === 'pt') return null;
  const startsOn = currentExpiresOn && currentExpiresOn >= today ? addDays(currentExpiresOn, 1) : today;
  const expiresOn = pkg.kind === 'time' ? addDays(addMonths(startsOn, pkg.months ?? 1), -1) : addDays(startsOn, (pkg.days ?? 1) - 1);
  return { startsOn, expiresOn };
}

/* ---------- พักสมาชิก ---------- */

export const FREEZE_MIN_DAYS = 7;
export const FREEZE_MAX_DAYS = 60;

export interface Freeze {
  from: string;
  until: string;
}

export function isFrozenOn(freeze: Freeze | null, today: string): boolean {
  return freeze !== null && today >= freeze.from && today <= freeze.until;
}

export type FreezeDecision =
  | { ok: true; freeze: Freeze; expiresOn: string }
  | { ok: false; reason: 'expired' | 'already-frozen' | 'invalid-days' };

/** พักสมาชิกตั้งแต่วันนี้ และเลื่อนวันหมดอายุออกไปเท่าจำนวนวันที่พัก */
export function planFreeze(member: { expiresOn: string; freeze: Freeze | null }, today: string, days: number): FreezeDecision {
  if (!Number.isInteger(days) || days < FREEZE_MIN_DAYS || days > FREEZE_MAX_DAYS) return { ok: false, reason: 'invalid-days' };
  if (isFrozenOn(member.freeze, today)) return { ok: false, reason: 'already-frozen' };
  if (member.expiresOn < today) return { ok: false, reason: 'expired' };
  return { ok: true, freeze: { from: today, until: addDays(today, days - 1) }, expiresOn: addDays(member.expiresOn, days) };
}

/** ยกเลิกพักก่อนกำหนด: คืนวันที่ยังไม่ได้ใช้ (รวมวันนี้ เพราะเข้ายิมได้ตั้งแต่วันนี้) */
export function planUnfreeze(member: { expiresOn: string; freeze: Freeze }, today: string): { expiresOn: string } {
  const unused = today > member.freeze.until ? 0 : daysBetween(today, member.freeze.until) + 1;
  return { expiresOn: addDays(member.expiresOn, -unused) };
}

export const FREEZE_REJECT: Record<Exclude<FreezeDecision, { ok: true }>['reason'], string> = {
  expired: 'สมาชิกหมดอายุแล้ว ต่ออายุก่อนจึงจะพักสมาชิกได้',
  'already-frozen': 'สมาชิกอยู่ระหว่างพักอยู่แล้ว',
  'invalid-days': `พักได้ ${String(FREEZE_MIN_DAYS)}–${String(FREEZE_MAX_DAYS)} วันต่อครั้ง`,
};

/** รหัสสมาชิกรูปแบบ FF-000000 */
export function memberCode(sequence: number): string {
  return `FF-${String(sequence).padStart(6, '0')}`;
}

/** ข้อความใน QR ของบัตรสมาชิก (เคาน์เตอร์สแกนแล้วได้รหัสสมาชิก) */
export function memberQrValue(code: string): string {
  return `FITFLOW:${code}`;
}

/** อ่านรหัสสมาชิกจากข้อความที่สแกนได้ หรือคืนข้อความเดิมถ้าไม่ใช่ QR ของระบบ */
export function parseMemberQr(value: string): string {
  const match = /^FITFLOW:(FF-\d{6})$/i.exec(value.trim());
  return match?.[1]?.toUpperCase() ?? value.trim();
}

export type MemberSort = 'expires' | 'name' | 'recent' | 'newest';

export const MEMBER_SORT_LABEL: Record<MemberSort, string> = {
  expires: 'ใกล้หมดอายุก่อน',
  name: 'ชื่อ ก–ฮ',
  recent: 'เช็กอินล่าสุด',
  newest: 'สมัครล่าสุด',
};

const thaiCollator = new Intl.Collator('th');

/** ตัวเปรียบเทียบสำหรับเรียงรายชื่อ — ค่าเท่ากันเรียงตามชื่อเสมอ เพื่อให้ลำดับคงที่ */
export function compareMembers(sort: MemberSort) {
  return (a: { name: string; daysLeft: number; lastCheckInAt: string | null; joinedOn: string }, b: typeof a): number => {
    const primary =
      sort === 'expires' ? a.daysLeft - b.daysLeft
      : sort === 'recent' ? (b.lastCheckInAt ?? '').localeCompare(a.lastCheckInAt ?? '')
      : sort === 'newest' ? b.joinedOn.localeCompare(a.joinedOn)
      : 0;
    return primary || thaiCollator.compare(a.name, b.name);
  };
}

/** รหัสผ่านเริ่มต้นของบัญชีสมาชิกที่สร้างตอนสมัคร (เข้าด้วยเบอร์โทร) — แจ้งสมาชิกให้เปลี่ยนเอง */
export const DEFAULT_MEMBER_PASSWORD = '12345678';
