import { ImageResponse } from 'next/og';
import { PULSE_PATH } from '@/web/components/layout/layout/layout.logo';

/*
 * รูปตัวอย่างตอนแชร์ลิงก์ (Facebook, LINE, X ฯลฯ) — สร้างตอน build
 * ฟอนต์ในตัวของ next/og ไม่มีอักษรไทย จึงใช้ข้อความภาษาอังกฤษ (ชื่อ/คำอธิบายภาษาไทยมาจาก og:title / og:description)
 */
export const alt = 'FitFlow — Gym & fitness management system';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 96px', background: '#120d0b', color: '#f5ede6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ width: 132, height: 132, borderRadius: 34, background: '#ff8a3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="104" height="104" viewBox="0 0 64 64"><path d={PULSE_PATH} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -3 }}>FitFlow</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 52, fontWeight: 700, color: '#ff8a3d' }}>Gym & fitness management, all in one</div>
        <div style={{ marginTop: 20, fontSize: 34, color: '#a8988b' }}>Members · QR check-in · Classes · Payments · Multi-branch</div>
      </div>
    ),
    size,
  );
}
