import { describe, expect, it } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  it('ให้ส่งได้ตามจำนวนที่กำหนดต่อช่วงเวลา แล้วบอกเวลารอ', () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(rateLimit('ip-a', 10, 3_600_000, t).ok).toBe(true);
    const blocked = rateLimit('ip-a', 10, 3_600_000, t + 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(3599);
  });

  it('เริ่มนับใหม่เมื่อหมดช่วงเวลา และแยกตาม key', () => {
    const t = 5_000_000;
    rateLimit('ip-b', 1, 1000, t);
    expect(rateLimit('ip-b', 1, 1000, t + 10).ok).toBe(false);
    expect(rateLimit('ip-b', 1, 1000, t + 1000).ok).toBe(true);
    expect(rateLimit('ip-c', 1, 1000, t).ok).toBe(true);
  });
});
