import 'server-only';

/**
 * Rate limit แบบ fixed window (§10.6) — ระยะที่ 1 เก็บในหน่วยความจำของ process เดียว
 * ระยะที่ 2 ย้ายไป Redis เพื่อให้ใช้ร่วมกันได้หลาย instance
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (bucket.count >= limit) return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  bucket.count++;
  return { ok: true, retryAfterSec: 0 };
}
