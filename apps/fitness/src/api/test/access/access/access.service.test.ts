import { describe, expect, it } from 'vitest';
import { clientIp, describeAgent, isLoopbackIp } from '@/api/services/access/access/access.service';

const from = (headers: Record<string, string>) => (name: string) => headers[name] ?? null;

describe('clientIp', () => {
  it('เอา IP ขวาสุดที่ไม่ใช่เครื่องตัวเอง (IIS ต่อท้าย · Next ต่อ 127.0.0.1)', () => {
    expect(clientIp(from({ 'x-forwarded-for': '1.1.1.1, 203.0.113.5, 127.0.0.1' }))).toBe('203.0.113.5');
    expect(clientIp(from({ 'x-forwarded-for': '203.0.113.5:51234' }))).toBe('203.0.113.5');
    expect(clientIp(from({ 'x-forwarded-for': '[2001:db8::1]:443, ::1' }))).toBe('2001:db8::1');
  });
  it('x-forwarded-for ว่างหรือมีแต่ IP ในเครื่อง → ลอง header อื่น', () => {
    expect(clientIp(from({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientIp(from({ 'x-forwarded-for': '127.0.0.1', forwarded: 'for="[2001:db8::2]:443";proto=https' }))).toBe('2001:db8::2');
    expect(clientIp(from({ 'x-forwarded-for': 'unknown', 'x-client-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });
  it('มีแต่ IP ในเครื่อง → IP นั้น · ไม่มีเลย → "ไม่ทราบ"', () => {
    expect(clientIp(from({ 'x-forwarded-for': '::ffff:127.0.0.1' }))).toBe('::ffff:127.0.0.1');
    expect(clientIp(from({}))).toBe('ไม่ทราบ');
    expect(clientIp(from({ 'x-forwarded-for': ' ' }))).toBe('ไม่ทราบ');
  });
});

describe('isLoopbackIp', () => {
  it('แยก IP เครื่องตัวเองออกจาก IP จริง', () => {
    expect(isLoopbackIp('127.0.0.1')).toBe(true);
    expect(isLoopbackIp('::1')).toBe(true);
    expect(isLoopbackIp('203.0.113.5')).toBe(false);
  });
});

describe('describeAgent', () => {
  it('ย่อชื่อเบราว์เซอร์และระบบ', () => {
    expect(describeAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge · Windows');
    expect(describeAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari · iOS');
    expect(describeAgent('')).toBe('ไม่ทราบ');
  });
});
