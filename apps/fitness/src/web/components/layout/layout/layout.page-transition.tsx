'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { wipeLabelFor, wipeTiming, type RouteLabel } from '@/web/lib/layout/layout/layout.motion-routes';

type Phase = 'cover' | 'reveal' | 'full';
interface Wipe { id: number; label: RouteLabel; phase: Phase }

/** แถบปิดทับนานสุดระหว่างรอหน้าใหม่ (เกินนี้เปิดแถบเอง เช่น server ช้าหรือการเปลี่ยนหน้าถูกยกเลิก) */
const MAX_COVER_MS = 3000;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * แถบเฉียงสีหลักตอนเปลี่ยนหน้า พร้อมชื่อเมนูภาษาอังกฤษ + ไทย (แอนิเมชันแบบ C)
 * - กดลิงก์ในระบบ → แถบเลื่อนเข้าปิดทันที (ระหว่างรอหน้าใหม่) แล้วเลื่อนออกเมื่อหน้าใหม่พร้อม
 * - เปลี่ยนหน้าจากโค้ด (redirect หลังบันทึก/เข้าสู่ระบบ) → เล่นแถบเข้า-ออกทั้งชุด
 * - ไปหน้า login (ออกจากระบบ) หรือผู้ใช้ตั้ง "ลดการเคลื่อนไหว" → ไม่แสดงแถบ
 */
export function PageTransition() {
  const pathname = usePathname();
  const [wipe, setWipe] = useState<Wipe | null>(null);
  const prevPath = useRef(pathname);
  const coverStarted = useRef(0);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(t => {
      window.clearTimeout(t);
    });
    timers.current = [];
  };
  const reveal = (id: number) => {
    setWipe(w => (w?.id === id ? { ...w, phase: 'reveal' } : w));
  };

  // กดลิงก์ภายในระบบ: เริ่มปิดทับก่อนหน้าใหม่มาถึง (capture เพราะ next/link เรียก preventDefault ใน handler ของตัวเอง)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduceMotion()) return;
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const label = wipeLabelFor(url.pathname);
      if (!label) return;
      clearTimers();
      const id = Date.now();
      coverStarted.current = performance.now();
      setWipe({ id, label, phase: 'cover' });
      later(() => {
        reveal(id);
      }, MAX_COVER_MS);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // หน้าใหม่แสดงแล้ว
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    if (reduceMotion()) return;
    const label = wipeLabelFor(pathname);
    if (!label) return;
    setWipe(w => {
      if (w?.phase === 'cover') {
        // ค้างให้เห็นชื่อเมนูครบ แล้วค่อยเปิด
        const { enter, hold } = wipeTiming(w.label.full);
        const wait = Math.max(0, enter + hold - (performance.now() - coverStarted.current));
        clearTimers();
        later(() => {
          reveal(w.id);
        }, wait);
        return w;
      }
      return { id: Date.now(), label, phase: 'full' };
    });
  }, [pathname]);

  useEffect(() => clearTimers, []);

  if (!wipe) return null;
  const t = wipeTiming(wipe.label.full);
  const style = { '--wipe-total': `${String(t.total)}ms`, '--wipe-enter': `${String(t.enter)}ms`, '--wipe-exit': `${String(t.exit)}ms` } as CSSProperties;
  return (
    <div
      aria-hidden
      data-phase={wipe.phase}
      style={style}
      onAnimationEnd={e => {
        if (e.target === e.currentTarget && wipe.phase !== 'cover') setWipe(null);
      }}
      className="ff-wipe pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-lime text-bg print:hidden"
    >
      <div className="ff-wipe-label px-6 text-center">
        <b className="block font-athletic text-[clamp(38px,8vw,96px)] leading-none font-extrabold tracking-[-.02em] whitespace-nowrap uppercase italic">{wipe.label.en}</b>
        <small className="mt-2 block font-display text-[clamp(14px,1.8vw,22px)] font-semibold">{wipe.label.th}</small>
      </div>
    </div>
  );
}
