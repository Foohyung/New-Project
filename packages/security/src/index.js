// Security headers ตามมาตรฐาน §10.5 — เขียนเป็น JavaScript ล้วนเพื่อให้ next.config.ts โหลดได้โดยไม่ต้อง transpile

/**
 * Content-Security-Policy แบบ nonce (ใช้ใน proxy.ts ของแต่ละ app)
 * @param {{ nonce: string, dev?: boolean, imgSrc?: string[] }} options
 */
export function buildCsp({ nonce, dev = false, imgSrc = [] }) {
  const directives = {
    'default-src': ["'self'"],
    // dev ต้องใช้ eval สำหรับ React Fast Refresh เท่านั้น
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...imgSrc],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(dev ? {} : { 'upgrade-insecure-requests': [] }),
  };
  return Object.entries(directives)
    .map(([key, values]) => [key, ...values].join(' '))
    .join('; ');
}

/**
 * Header อื่น ๆ ที่ใส่ทุก response ผ่าน next.config `headers()`
 * @param {{ permissions?: Record<string, string> }} [options] เช่น { camera: 'self' } สำหรับสแกน QR
 */
export function securityHeaders({ permissions = {} } = {}) {
  const policy = { camera: '', microphone: '', geolocation: '', payment: '', usb: '', ...permissions };
  const permissionsPolicy = Object.entries(policy)
    .map(([feature, allow]) => `${feature}=(${allow})`)
    .join(', ');
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: permissionsPolicy },
  ];
}

/** สร้าง nonce แบบสุ่มสำหรับ CSP */
export function createNonce() {
  return btoa(crypto.randomUUID());
}
