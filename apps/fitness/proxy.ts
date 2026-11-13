import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce, requireHttps } from '@/api/lib/security/security/security';

/** ใส่ Content-Security-Policy แบบ nonce ทุก request (§10.5) — Next.js ใส่ nonce ให้ script ของตัวเองอัตโนมัติ */
export function proxy(request: NextRequest) {
  // ยังไม่ได้เข้าสู่ระบบ → ไปหน้า login พร้อมจำหน้าที่จะไป — ยกเว้นหน้าแรก / ที่เป็นหน้าสาธารณะ (server ตรวจ session จริงอีกชั้นใน requireSession)
  const { pathname, search } = request.nextUrl;
  if (!request.cookies.has('ff-session') && pathname !== '/' && pathname !== '/login' && pathname !== '/forgot-password') {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  const nonce = createNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV !== 'production', https: requireHttps() });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // หน้าปัจจุบัน ให้ accessDenied() รู้ว่าไม่ควรเด้งกลับมาหน้าเดิม (กันวนซ้ำ)
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // ไอคอนเว็บต้องโหลดได้ก่อนเข้าสู่ระบบ (หน้า login ใช้ด้วย) · ไฟล์ SEO/GEO ต้องให้ bot อ่านได้โดยไม่ถูกพาไปหน้า login
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|robots.txt|sitemap.xml|llms.txt|opengraph-image|twitter-image).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
