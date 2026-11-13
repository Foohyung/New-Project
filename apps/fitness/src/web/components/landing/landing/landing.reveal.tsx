'use client';

import { useEffect } from 'react';

/**
 * ส่วนที่มี data-reveal ค่อย ๆ ลอยขึ้นเมื่อเลื่อนถึง (เหมือน mockup แบบ D) — ส่วนที่อยู่ในจอตอนโหลดก็ลอยขึ้นทันที
 * ไม่มี JavaScript หรือตั้งลดการเคลื่อนไหว = แสดงทุกอย่างตามปกติ
 */
export function LandingReveal() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute('data-hidden');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const el of items) {
      el.setAttribute('data-hidden', '');
      io.observe(el);
    }
    return () => { io.disconnect(); };
  }, []);
  return null;
}
