import { describe, expect, it } from 'vitest';
import { isLocked, landingFor, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, normalizeIdentifier, recordFailure, safeNextPath, type AttemptState } from './service';

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
