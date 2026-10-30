import { encode } from 'uqr';

/** วาด QR เป็น SVG path เดียว (ไม่ใช้ dangerouslySetInnerHTML) */
export function QrCode({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const { data, size } = encode(value, { ecc: 'M', border: 2 });
  let d = '';
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) d += `M${String(x)} ${String(y)}h1v1h-1z`;
    });
  });
  return (
    <svg viewBox={`0 0 ${String(size)} ${String(size)}`} role="img" aria-label={label} shapeRendering="crispEdges" className={`block rounded-xl bg-white ${className}`}>
      <path d={d} fill="#0b0d10" />
    </svg>
  );
}
