import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce, securityHeaders } from './index.js';

describe('security headers', () => {
  it('CSP ใช้ nonce และไม่อนุญาต unsafe-eval ใน production', () => {
    const csp = buildCsp({ nonce: 'abc' });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('ปิดทุก permission ที่ไม่ได้เปิดไว้', () => {
    const policy = securityHeaders({ permissions: { camera: 'self' } }).find(h => h.key === 'Permissions-Policy');
    expect(policy?.value).toContain('camera=(self)');
    expect(policy?.value).toContain('microphone=()');
  });

  it('nonce ไม่ซ้ำกัน', () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
