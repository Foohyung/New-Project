import { ImageResponse } from 'next/og';
import { PULSE_PATH } from '@/web/components/layout/layout/layout.logo';

/* ไอคอนหน้าจอโฮม iPhone/iPad (180×180) — สีเดียวกับ app/icon.svg (ส้ม #FF8A3D เส้นขาว) · iOS ตัดมุมโค้งให้เอง จึงใช้สี่เหลี่ยมเต็ม */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FF8A3D' }}>
        <svg width="150" height="150" viewBox="0 0 64 64"><path d={PULSE_PATH} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    ),
    size,
  );
}
