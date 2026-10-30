import { describe, expect, it } from 'vitest';
import { addMonths, compareMembers, daysLeft, isFrozenOn, memberCode, memberQrValue, membershipPeriod, membershipStatus, parseMemberQr, planFreeze, planUnfreeze } from '@/api/services/members/members/members.service';

const today = '2026-10-15';

describe('membershipStatus', () => {
  it('ใช้งานปกติเมื่อเหลือเกิน 7 วัน', () => {
    expect(membershipStatus({ expiresOn: '2027-08-12', frozen: false }, today)).toBe('active');
  });

  it('ใกล้หมดอายุเมื่อเหลือ 0–7 วัน (วันสุดท้ายยังใช้ได้)', () => {
    expect(membershipStatus({ expiresOn: '2026-10-22', frozen: false }, today)).toBe('expiring');
    expect(membershipStatus({ expiresOn: '2026-10-15', frozen: false }, today)).toBe('expiring');
  });

  it('หมดอายุเมื่อเลยวันหมดอายุแล้ว', () => {
    expect(membershipStatus({ expiresOn: '2026-10-14', frozen: false }, today)).toBe('expired');
  });

  it('พักสมาชิกมาก่อนสถานะอื่น', () => {
    expect(membershipStatus({ expiresOn: '2026-10-09', frozen: true }, today)).toBe('frozen');
  });

  it('นับวันคงเหลือข้ามปี', () => {
    expect(daysLeft({ expiresOn: '2027-08-12', frozen: false }, today)).toBe(301);
  });
});

describe('addMonths', () => {
  it('ปัดเป็นวันสุดท้ายของเดือนเมื่อวันเกินสิ้นเดือน', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-10-15', 12)).toBe('2027-10-15');
  });
});

describe('membershipPeriod (A.1 ต่ออายุ)', () => {
  const monthly = { kind: 'time' as const, months: 1 };
  it('ยังไม่หมดอายุ: ต่อจากวันหมดอายุเดิม ไม่เสียวันที่เหลือ', () => {
    expect(membershipPeriod(monthly, '2026-10-18', today)).toEqual({ startsOn: '2026-10-19', expiresOn: '2026-11-18' });
  });
  it('วันสุดท้ายของสมาชิกยังนับว่าใช้งานอยู่', () => {
    expect(membershipPeriod(monthly, today, today)).toEqual({ startsOn: '2026-10-16', expiresOn: '2026-11-15' });
  });
  it('หมดอายุแล้วหรือสมัครใหม่: เริ่มนับวันนี้', () => {
    expect(membershipPeriod(monthly, '2026-10-09', today)).toEqual({ startsOn: today, expiresOn: '2026-11-14' });
    expect(membershipPeriod({ kind: 'time', months: 12 }, null, today)).toEqual({ startsOn: today, expiresOn: '2027-10-14' });
  });
  it('Day pass ใช้ได้เฉพาะวันนี้ และแพ็กเกจ PT ไม่เปลี่ยนวันหมดอายุ', () => {
    expect(membershipPeriod({ kind: 'daypass', days: 1 }, null, today)).toEqual({ startsOn: today, expiresOn: today });
    expect(membershipPeriod({ kind: 'pt', sessions: 10 }, '2026-12-01', today)).toBeNull();
  });
});

describe('พักสมาชิก (A.1)', () => {
  const member = { expiresOn: '2026-12-31', freeze: null };
  it('พักตั้งแต่วันนี้และเลื่อนวันหมดอายุออกไปเท่าจำนวนวันที่พัก', () => {
    expect(planFreeze(member, today, 14)).toEqual({ ok: true, freeze: { from: today, until: '2026-10-28' }, expiresOn: '2027-01-14' });
  });
  it('จำกัด 7–60 วัน และห้ามพักซ้อนหรือพักตอนหมดอายุ', () => {
    expect(planFreeze(member, today, 6)).toEqual({ ok: false, reason: 'invalid-days' });
    expect(planFreeze(member, today, 61)).toEqual({ ok: false, reason: 'invalid-days' });
    expect(planFreeze({ expiresOn: '2026-12-31', freeze: { from: '2026-10-10', until: '2026-10-20' } }, today, 7)).toEqual({ ok: false, reason: 'already-frozen' });
    expect(planFreeze({ expiresOn: '2026-10-01', freeze: null }, today, 7)).toEqual({ ok: false, reason: 'expired' });
  });
  it('ยกเลิกก่อนกำหนดคืนวันที่ยังไม่ได้ใช้ (รวมวันนี้)', () => {
    // พัก 1–14 พ.ย. (14 วัน) แล้วยกเลิกวันที่ 10 → ใช้ไป 9 วัน คืน 5 วัน
    expect(planUnfreeze({ expiresOn: '2027-01-14', freeze: { from: '2026-11-01', until: '2026-11-14' } }, '2026-11-10')).toEqual({ expiresOn: '2027-01-09' });
    expect(planUnfreeze({ expiresOn: '2027-01-14', freeze: { from: '2026-11-01', until: '2026-11-14' } }, '2026-11-20')).toEqual({ expiresOn: '2027-01-14' });
  });
  it('isFrozenOn นับรวมวันเริ่มและวันสุดท้าย', () => {
    const f = { from: '2026-10-10', until: '2026-10-15' };
    expect([isFrozenOn(f, '2026-10-09'), isFrozenOn(f, '2026-10-10'), isFrozenOn(f, today), isFrozenOn(f, '2026-10-16')]).toEqual([false, true, true, false]);
  });
});

describe('รหัสและ QR สมาชิก', () => {
  it('สร้างรหัส 6 หลัก และอ่านกลับจาก QR ได้', () => {
    expect(memberCode(2332)).toBe('FF-002332');
    expect(parseMemberQr(memberQrValue('FF-002332'))).toBe('FF-002332');
    expect(parseMemberQr(' fitflow:ff-002318 ')).toBe('FF-002318');
    expect(parseMemberQr('080-000-0101')).toBe('080-000-0101');
  });
});

describe('compareMembers (เรียงรายชื่อ)', () => {
  const rows = [
    { name: 'อรวรรณ', daysLeft: 3, lastCheckInAt: '2026-10-15T01:00:00Z', joinedOn: '2026-01-01' },
    { name: 'กิตติ', daysLeft: 30, lastCheckInAt: null, joinedOn: '2026-09-01' },
    { name: 'ธนกร', daysLeft: 3, lastCheckInAt: '2026-10-15T09:00:00Z', joinedOn: '2025-05-01' },
  ];
  const names = (sort: Parameters<typeof compareMembers>[0]) => [...rows].sort(compareMembers(sort)).map(r => r.name);

  it('ใกล้หมดอายุก่อน ค่าเท่ากันเรียงตามชื่อ', () => {
    expect(names('expires')).toEqual(['ธนกร', 'อรวรรณ', 'กิตติ']);
  });
  it('ชื่อเรียงตามพจนานุกรมไทย', () => {
    expect(names('name')).toEqual(['กิตติ', 'ธนกร', 'อรวรรณ']);
  });
  it('เช็กอินล่าสุดก่อน คนที่ไม่เคยเช็กอินอยู่ท้าย', () => {
    expect(names('recent')).toEqual(['ธนกร', 'อรวรรณ', 'กิตติ']);
  });
  it('สมัครล่าสุดก่อน', () => {
    expect(names('newest')).toEqual(['กิตติ', 'อรวรรณ', 'ธนกร']);
  });
});
