'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** จอตั้งแต่ md (768px) มีเมนูด้านข้างครบแล้ว — ตรงกับ `md:hidden` ของแถบเมนูล่างและ `md:grid` ของ app shell */
const SIDEBAR_QUERY = '(min-width: 768px)';

/** หน้าที่จะกลับไป: หน้าก่อนหน้าในเว็บเดียวกัน (ยกเว้น /more และ /login) ไม่อย่างนั้นหน้าแรก */
function previousPage(): string {
  try {
    const url = new URL(document.referrer);
    if (url.origin === location.origin && url.pathname !== '/more' && !url.pathname.startsWith('/login')) return url.pathname + url.search;
  } catch {
    // ไม่มี referrer
  }
  return '/';
}

/**
 * หน้า /more ใช้เฉพาะมือถือ (แถบเมนูล่างแสดงได้ไม่เกิน 5 เมนู)
 * เปิดบนจอใหญ่ หรือขยายจอ/หมุนจอจนถึง md → พากลับหน้าก่อนหน้า เพราะเมนูด้านข้างแสดงทุกเมนูอยู่แล้ว
 */
export function LeaveMoreOnWideScreen() {
  const router = useRouter();
  useEffect(() => {
    const media = matchMedia(SIDEBAR_QUERY);
    const leave = () => {
      if (media.matches) router.replace(previousPage());
    };
    leave();
    media.addEventListener('change', leave);
    return () => {
      media.removeEventListener('change', leave);
    };
  }, [router]);
  return null;
}
