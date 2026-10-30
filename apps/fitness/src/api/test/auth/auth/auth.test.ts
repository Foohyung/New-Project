import { describe, expect, it } from 'vitest';
import { accountUsable, isLocked, landingFor, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, normalizeIdentifier, recordFailure, safeNextPath, type AttemptState } from '@/api/services/auth/auth/auth.service';
import { hasPermission, permissionsAllowedForRole, permissionsForRole } from '@/api/services/auth/auth/auth.roles';

describe('สิทธิ์จัดการระบบ', () => {
  it('admin และ owner จัดการบัญชีได้ แต่การตั้งค่าแบรนด์เป็นของ owner เท่านั้น', () => {
    expect(hasPermission('admin', 'users.manage')).toBe(true);
    expect(hasPermission('owner', 'users.manage')).toBe(true);
    expect(hasPermission('owner', 'branding.manage')).toBe(true);
    expect(hasPermission('admin', 'branding.manage')).toBe(false);
    expect(hasPermission('manager', 'users.manage')).toBe(false);
  });

  it('ให้ทุก role รับสิทธิ์ระบบได้ และสงวนการจัดการ role ให้ admin', () => {
    expect(hasPermission('supervisor', 'reports.view', ['reports.view'])).toBe(true);
    expect(hasPermission('supervisor', 'users.manage', ['reports.view'])).toBe(false);
    expect(permissionsAllowedForRole('supervisor', ['members.view', 'payments.view'])).toBe(true);
    expect(permissionsAllowedForRole('supervisor', ['portal.use', 'members.view', 'payments.confirm'])).toBe(true);
    expect(permissionsAllowedForRole('supervisor', ['roles.manage'])).toBe(false);
    expect(permissionsAllowedForRole('member', ['dashboard.view', 'members.manage', 'payments.view'])).toBe(true);
    expect(permissionsAllowedForRole('trainer', ['revenue.view', 'users.manage', 'portal.use'])).toBe(true);
    expect(permissionsForRole('member', ['portal.use', 'members.view', 'coach.use', 'payments.view'])).toEqual(['portal.use', 'members.view', 'coach.use', 'payments.view']);
    expect(permissionsForRole('trainer', ['dashboard.view', 'payments.confirm'])).toEqual(['dashboard.view', 'payments.confirm']);
  });
});

describe('normalizeIdentifier', () => {
  it('อีเมลไม่สนตัวพิมพ์ เบอร์โทรไม่สนขีดและช่องว่าง', () => {
    expect(normalizeIdentifier('  Manager@FitFlow.test ')).toBe('manager@fitflow.test');
    expect(normalizeIdentifier('080-000-0101')).toBe('0800000101');
    expect(normalizeIdentifier('080 000 0101')).toBe('0800000101');
  });
});

describe('landingFor', () => {
  it('ส่งแต่ละบทบาทไปหน้าแรกของตัวเอง', () => {
    expect(landingFor('member')).toBe('/me');
    expect(landingFor('trainer')).toBe('/classes');
    expect(landingFor('manager')).toBe('/');
  });
});

describe('safeNextPath', () => {
  it('รับเฉพาะ path ภายในเว็บ', () => {
    expect(safeNextPath('/members/02')).toBe('/members/02');
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath('/login?next=/')).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});

describe('ล็อกเมื่อใส่รหัสผิดหลายครั้ง', () => {
  const now = 1_000_000;
  it(`ใส่ผิด ${String(MAX_FAILED_ATTEMPTS)} ครั้งล็อก ${String(LOCKOUT_MINUTES)} นาที`, () => {
    let state: AttemptState | undefined;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) state = recordFailure(state, now);
    expect(isLocked(state, now)).toBe(false);
    state = recordFailure(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(isLocked(state, now + LOCKOUT_MINUTES * 60_000 + 1)).toBe(false);
  });
  it('หมดเวลาล็อกแล้วเริ่มนับใหม่', () => {
    const locked: AttemptState = { failures: MAX_FAILED_ATTEMPTS, lockedUntil: now };
    expect(recordFailure(locked, now + 1)).toEqual({ failures: 1, lockedUntil: null });
  });
});

describe('ช่วงวันที่ใช้งานบัญชี (active from / to)', () => {
  const base = { active: true, activeFrom: null, activeTo: null };
  it('ไม่กำหนดช่วง = ใช้ได้เสมอ · ปิดใช้งาน = ใช้ไม่ได้แม้อยู่ในช่วง', () => {
    expect(accountUsable(base, '2026-10-29')).toBe(true);
    expect(accountUsable({ ...base, active: false, activeFrom: '2026-01-01' }, '2026-10-29')).toBe(false);
  });
  it('รวมวันแรกและวันสุดท้าย', () => {
    const ranged = { ...base, activeFrom: '2026-11-01', activeTo: '2026-11-30' };
    expect(accountUsable(ranged, '2026-10-31')).toBe(false);
    expect(accountUsable(ranged, '2026-11-01')).toBe(true);
    expect(accountUsable(ranged, '2026-11-30')).toBe(true);
    expect(accountUsable(ranged, '2026-12-01')).toBe(false);
  });
  it('กำหนดแค่ฝั่งเดียวได้', () => {
    expect(accountUsable({ ...base, activeTo: '2026-10-28' }, '2026-10-29')).toBe(false);
    expect(accountUsable({ ...base, activeFrom: '2026-10-29' }, '2026-10-29')).toBe(true);
  });
});
