import { describe, expect, it } from 'vitest';
import { accountUsable, deniedTarget, isLocked, landingFor, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, normalizeIdentifier, recordFailure, safeNextPath, SESSION_IDLE_MS, SESSION_IDLE_MINUTES, sessionIdleExpired, type AttemptState } from '@/api/services/auth/auth/auth.service';
import { hasPermission, permissionsAllowedForRole, permissionsForRole } from '@/api/services/auth/auth/auth.roles';

describe('สิทธิ์จัดการระบบ', () => {
  it('admin และ owner จัดการบัญชีและแบรนด์สาขาได้', () => {
    expect(hasPermission('admin', 'users.manage')).toBe(true);
    expect(hasPermission('owner', 'users.manage')).toBe(true);
    expect(hasPermission('owner', 'branding.manage')).toBe(true);
    expect(hasPermission('admin', 'branding.manage')).toBe(true);
    expect(hasPermission('admin', 'payments.configure')).toBe(true);
    expect(hasPermission('owner', 'payments.configure')).toBe(true);
    expect(hasPermission('manager', 'payments.configure')).toBe(false);
    expect(hasPermission('manager', 'users.manage')).toBe(false);
  });

  it('จัดการสาขาได้เฉพาะ admin', () => {
    expect(hasPermission('admin', 'branches.manage')).toBe(true);
    expect(hasPermission('owner', 'branches.manage')).toBe(false);
    expect(hasPermission('manager', 'branches.manage')).toBe(false);
  });

  it('สิทธิ์แบรนด์สาขาถูกกำหนดให้ admin ที่มี role grants อยู่แล้วด้วย', () => {
    expect(permissionsForRole('admin', ['roles.manage', 'branches.manage'])).toContain('branding.manage');
  });

  it('กำหนดสิทธิ์ดูประวัติการเข้าสู่ระบบให้ role ได้จากหน้าจัดการ role', () => {
    expect(hasPermission('admin', 'access.view')).toBe(true);
    expect(hasPermission('owner', 'access.view')).toBe(false);
    // ประวัติการเข้าสู่ระบบสงวนให้ admin: role อื่นติ๊กให้ไม่ได้ และสิทธิ์ที่ค้างอยู่ถูกตัดทิ้ง
    expect(permissionsAllowedForRole('owner', ['access.view'])).toBe(false);
    expect(permissionsAllowedForRole('supervisor', ['access.view'])).toBe(false);
    expect(permissionsForRole('owner', ['access.view'])).not.toContain('access.view');
    expect(permissionsForRole('admin', ['roles.manage', 'access.view'])).toContain('access.view');
    expect(permissionsAllowedForRole('supervisor', ['branches.manage'])).toBe(false);
  });

  it('ทุก role ระบบซื้อสินค้าหน้าร้านได้ โดยไม่รับสิทธิ์จัดการสินค้าเพิ่ม', () => {
    for (const role of ['admin', 'owner', 'manager', 'front-desk', 'trainer', 'member'] as const) {
      expect(hasPermission(role, 'sales.use')).toBe(true);
    }
    expect(hasPermission('trainer', 'products.manage')).toBe(false);
    expect(hasPermission('member', 'products.manage')).toBe(false);
  });

  it('ให้ทุก role รับสิทธิ์ระบบได้ และสงวนการจัดการ role ให้ admin', () => {
    expect(hasPermission('supervisor', 'reports.view', ['reports.view'])).toBe(true);
    expect(hasPermission('supervisor', 'users.manage', ['reports.view'])).toBe(false);
    expect(permissionsAllowedForRole('supervisor', ['members.view', 'payments.view'])).toBe(true);
    expect(permissionsAllowedForRole('supervisor', ['portal.use', 'members.view', 'payments.confirm'])).toBe(true);
    expect(permissionsAllowedForRole('supervisor', ['roles.manage'])).toBe(false);
    expect(permissionsAllowedForRole('owner', ['branches.manage'])).toBe(false);
    expect(permissionsAllowedForRole('admin', ['roles.manage', 'branches.manage'])).toBe(true);
    expect(permissionsAllowedForRole('member', ['dashboard.view', 'members.manage', 'payments.view'])).toBe(true);
    expect(permissionsAllowedForRole('trainer', ['revenue.view', 'users.manage', 'portal.use'])).toBe(true);
    expect(permissionsForRole('member', ['portal.use', 'members.view', 'coach.use', 'payments.view'])).toEqual(['portal.use', 'members.view', 'coach.use', 'payments.view', 'sales.use']);
    expect(permissionsForRole('trainer', ['dashboard.view', 'payments.confirm'])).toEqual(['dashboard.view', 'payments.confirm', 'sales.use']);
    expect(hasPermission('supervisor', 'sales.use', ['reports.view'])).toBe(true);
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
    expect(landingFor('manager')).toBe('/dashboard');
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

describe('deniedTarget', () => {
  it('กลับหน้าก่อนหน้า (Referer) พร้อม ?denied=1 และคง query เดิม', () => {
    expect(deniedTarget('https://gym.example/members?status=active', '/reports', '/')).toBe('/members?status=active&denied=1');
  });
  it('ไม่มี Referer, เป็นหน้าเดิม, หน้า login หรือมาจากเว็บอื่นแบบ //evil → หน้าแรกของตำแหน่ง', () => {
    expect(deniedTarget(null, '/reports', '/')).toBe('/?denied=1');
    expect(deniedTarget('https://gym.example/reports?from=2026-10-01', '/reports', '/')).toBe('/?denied=1');
    expect(deniedTarget('https://gym.example/login', '/reports', '/classes')).toBe('/classes?denied=1');
    expect(deniedTarget('not a url', '/reports', '/me')).toBe('/me?denied=1');
  });
  it('หน้าแรกของตำแหน่งคือหน้าที่ไม่มีสิทธิ์เอง → null (แสดงกล่องไม่มีสิทธิ์แทน กันวนซ้ำ)', () => {
    expect(deniedTarget(null, '/', '/')).toBeNull();
  });
});

describe('session inactivity timeout', () => {
  it('กำหนดเวลา idle 15 นาที และหมดอายุเมื่อครบกำหนดพอดี', () => {
    expect(SESSION_IDLE_MINUTES).toBe(15);
    expect(sessionIdleExpired(1_000, 1_000 + SESSION_IDLE_MS - 1)).toBe(false);
    expect(sessionIdleExpired(1_000, 1_000 + SESSION_IDLE_MS)).toBe(true);
  });
});
