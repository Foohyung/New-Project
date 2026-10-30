// Security headers ตามมาตรฐาน §10.5 (ใช้ใน next.config.ts และ proxy.ts)

/**
 * บังคับ HTTPS หรือไม่ (cookie แบบ secure + CSP upgrade-insecure-requests)
 * ALLOW_HTTP=1 = ยอมให้ใช้ผ่าน http://IP ชั่วคราวเพื่อทดสอบเท่านั้น — ห้ามตั้งเมื่อเปิดใช้งานจริง (cookie ถูกดักอ่านได้)
 */
export function requireHttps(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.ALLOW_HTTP !== '1';
}

/** Content-Security-Policy แบบ nonce (ใช้ใน proxy.ts) */
export function buildCsp({ nonce, dev = false, https = !dev, imgSrc = [] }: { nonce: string; dev?: boolean; https?: boolean; imgSrc?: string[] }): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // dev ต้องใช้ eval สำหรับ React Fast Refresh เท่านั้น
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', ...imgSrc],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(https ? { 'upgrade-insecure-requests': [] } : {}),
  };
  return Object.entries(directives)
    .map(([key, values]) => [key, ...values].join(' '))
    .join('; ');
}

/** Header อื่น ๆ ที่ใส่ทุก response ผ่าน next.config `headers()` · permissions เช่น { camera: 'self' } สำหรับสแกน QR */
export function securityHeaders({ permissions = {} }: { permissions?: Record<string, string> } = {}): { key: string; value: string }[] {
  const policy = { camera: '', microphone: '', geolocation: '', payment: '', usb: '', ...permissions };
  const permissionsPolicy = Object.entries(policy)
    .map(([feature, allow]) => `${feature}=(${allow})`)
    .join(', ');
  return [
    // HSTS เฉพาะ production — ส่งใน dev ทำให้ Chrome บังคับ HTTPS บน localhost แล้วเข้าไม่ได้
    ...(process.env.NODE_ENV === 'production'
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: permissionsPolicy },
  ];
}

/** สร้าง nonce แบบสุ่มสำหรับ CSP */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
