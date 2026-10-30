'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** เวลาที่ตัวเลขวิ่งจาก 0 ถึงค่าจริง (ms) — ลดเลขนี้ = ตัวเลขวิ่งเร็วขึ้น (ไม่ขึ้นกับ SLOW) */
export const COUNT_MS = 900;

/**
 * ตัวเลขนับขึ้นจาก 0 ตอนเปิดหน้า — รับข้อความที่จัดรูปแบบแล้ว (เช่น "฿412,350", "47 คน", "1,248")
 * นับเฉพาะตัวเลขชุดแรก คงตัวหน้า/ตัวหลัง/ลูกน้ำ/ทศนิยมไว้ · server render ค่าจริงเสมอ
 * - จองความกว้างด้วยค่าจริง (::before ที่มองไม่เห็น) ตัวเลขที่วิ่งจึงไม่ดันข้อความรอบข้างให้ขยับ
 * - ถ้าผู้ใช้เห็นค่าจริงไปแล้ว (JS โหลดช้ากว่าที่เนื้อหาโผล่) จะไม่นับใหม่จาก 0 — กันตัวเลขกระโดดกลับ
 */
export function CountUp({ text, ms = COUNT_MS, className = '' }: { text: string; ms?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // เขียนตัวเลขลง DOM โดยตรงทุกเฟรม (ไม่ re-render React 60 ครั้ง/วินาที) แล้วจบที่ข้อความจริงเสมอ
  useEffect(() => {
    const el = ref.current;
    const m = /^(\D*)([\d,]+(?:\.\d+)?)(.*)$/s.exec(text);
    if (!el || !m || reduceMotion()) return;
    // ส่วนของหน้าที่ตัวเลขอยู่ยังจางอยู่ = เพิ่งเริ่มเข้า → นับได้ · โผล่ชัดแล้ว = แสดงค่าจริงต่อไป
    const host = el.closest('main > *') ?? el;
    if (Number(getComputedStyle(host).opacity) > 0.35) return;
    const [, pre = '', raw = '0', post = ''] = m;
    const decimals = raw.includes('.') ? (raw.split('.')[1]?.length ?? 0) : 0;
    const target = Number(raw.replace(/,/g, ''));
    const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: raw.includes(',') });
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      el.textContent = p < 1 ? `${pre}${fmt.format(target * (1 - (1 - p) ** 3))}${post}` : text;
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = text;
    };
  }, [text, ms]);
  return (
    <span data-final={text} className={`inline-grid tabular-nums before:invisible before:[grid-area:1/1] before:content-[attr(data-final)] ${className}`}>
      <span ref={ref} className="[grid-area:1/1]">{text}</span>
    </span>
  );
}

const COLORS = ['var(--color-lime)', 'var(--color-cyan)', 'var(--color-warn)', 'var(--color-violet)', 'var(--color-ink)'];

/** พลุกระดาษเต็มจอครั้งเดียว — `onceKey` = จำใน sessionStorage ว่าเล่นแล้ว (เปิดหน้าซ้ำไม่เล่นอีก) */
export function Confetti({ onceKey, count = 70 }: { onceKey?: string; count?: number }) {
  const [pieces, setPieces] = useState<CSSProperties[]>([]);
  useEffect(() => {
    if (reduceMotion()) return;
    const played = () => {
      try {
        return onceKey !== undefined && sessionStorage.getItem(onceKey) !== null;
      } catch {
        return false; // โหมดส่วนตัวที่ใช้ storage ไม่ได้ → เล่นทุกครั้งก็ได้
      }
    };
    if (played()) return;
    // บันทึกว่าเล่นแล้วในเฟรมที่เล่นจริง (React dev รัน effect สองรอบ ถ้าบันทึกก่อนจะไม่ได้เล่นเลย)
    const frame = requestAnimationFrame(() => {
      try {
        if (onceKey) sessionStorage.setItem(onceKey, '1');
      } catch {
        // ไม่เป็นไร
      }
      setPieces(
        Array.from({ length: count }, (_, i) => ({
          left: `${String(Math.random() * 100)}%`,
          background: COLORS[i % COLORS.length],
          '--fall': `${String(1.3 + Math.random() * 0.9)}s`,
          '--fall-delay': `${String(Math.random() * 0.35)}s`,
          '--drift': `${String(Math.round((Math.random() - 0.5) * 160))}px`,
          '--spin': `${String(Math.round(360 + Math.random() * 540))}deg`,
        }) as CSSProperties),
      );
    });
    const t = window.setTimeout(() => {
      setPieces([]);
    }, 2600);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [onceKey, count]);
  if (pieces.length === 0) return null;
  return (
    <div aria-hidden className="ff-confetti pointer-events-none fixed inset-0 z-[90] overflow-hidden print:hidden">
      {pieces.map((s, i) => <i key={i} className="ff-confetti-piece" style={s} />)}
    </div>
  );
}

/** แถบข้อความวิ่ง MOVE. TRAIN. REPEAT. (ตกแต่ง — ซ่อนจาก screen reader) */
export function Marquee({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`ff-marquee overflow-hidden border-y border-line py-1.5 font-athletic text-xs font-extrabold tracking-[.12em] whitespace-nowrap text-lime italic ${className}`}>
      <span>{'MOVE. TRAIN. REPEAT. · '.repeat(16)}</span>
    </div>
  );
}
