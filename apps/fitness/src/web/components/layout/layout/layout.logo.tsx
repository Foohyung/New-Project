/*
 * โลโก้ FitFlow แบบ 01 Pulse Bolt — เส้นชีพจรที่พุ่งขึ้นเป็นสายฟ้า (designs/FitFlow-โลโก้-10-แบบ.pdf)
 * ใช้สีจากธีม (currentColor) จึงเปลี่ยนตามธีมเอง · favicon อยู่ที่ app/icon.svg
 */
export const PULSE_PATH = 'M8 35h11l4-9 6 19 7-27 4 17h16';

/**
 * เฉพาะเส้นชีพจร — วางในกล่องสีหลักที่ผู้เรียกกำหนดขนาด/สีเอง
 * - run = เส้นจางอยู่ตลอด + ช่วงสว่างวิ่งไปตามเส้นไม่หยุด เหมือนจอวัดชีพจร
 */
export function PulseMark({ className = '', strokeWidth = 5, run = false }: { className?: string; strokeWidth?: number; run?: boolean }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {run ? (
        <>
          <path d={PULSE_PATH} {...stroke} opacity={0.25} />
          <path d={PULSE_PATH} {...stroke} pathLength={1} className="ff-pulse-run" />
        </>
      ) : (
        <path d={PULSE_PATH} {...stroke} />
      )}
    </svg>
  );
}

/** ไอคอนแอป: กล่องมุมโค้งสีหลัก + เส้นชีพจร (`inverse` = กล่องสีพื้นหลัง ใช้บนแผงสีหลัก) */
export function LogoIcon({ className = 'size-9 rounded-[10px]', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center ${inverse ? 'bg-bg text-lime' : 'bg-lime text-bg'} ${className}`}>
      <PulseMark className="size-full" />
    </span>
  );
}

/** ชื่อแบรนด์ FIT + FLOW สีหลัก (`inverse` = ตัวอักษรสีเดียวบนแผงสีหลัก) */
export function Wordmark({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`font-display font-bold tracking-[.08em] ${className}`}>
      FIT<span className={inverse ? '' : 'text-lime'}>FLOW</span>
    </span>
  );
}
