import { describe, expect, it } from 'vitest';
import { hasPermission } from './roles';
import { isLocked, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, recordFailure, safeNextPath, type AttemptState } from './service';

describe('เข้าสู่ระบบหลังบ้าน', () => {
  it('รับเฉพาะ path ของหลังบ้าน กัน open redirect', () => {
    expect(safeNextPath('/agent/stock?view=cards')).toBe('/agent/stock?view=cards');
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('/agent/login')).toBeNull();
    expect(safeNextPath('/agent\\@evil.com')).toBeNull();
  });
  it('ล็อกบัญชีเมื่อใส่ผิดครบ และปลดล็อกเมื่อหมดเวลา', () => {
    let s: AttemptState | undefined;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) s = recordFailure(s, 1000);
    expect(isLocked(s, 1000)).toBe(true);
    expect(isLocked(s, 1000 + LOCKOUT_MINUTES * 60_000 + 1)).toBe(false);
    expect(recordFailure(s, 1000 + LOCKOUT_MINUTES * 60_000 + 1).failures).toBe(1);
  });
  it('เฉพาะ admin เห็นข้อมูลของ agent ทุกคน', () => {
    expect(hasPermission('admin', 'agents.all')).toBe(true);
    expect(hasPermission('agent', 'agents.all')).toBe(false);
    expect(hasPermission('agent', 'ledger.manage')).toBe(true);
  });
});
