import { describe, expect, it } from 'vitest';
import { routeLabel, WIPE_MS, wipeLabelFor, wipeTiming } from '@/web/lib/layout/layout/layout.motion-routes';

describe('ป้ายแถบเปลี่ยนหน้า', () => {
  it('หน้าเมนูได้ชื่ออังกฤษ + ไทย', () => {
    expect(routeLabel('/')).toEqual({ en: 'Dashboard', th: 'แดชบอร์ด', full: false });
    expect(routeLabel('/marketing/coupons')?.en).toBe('Coupons');
  });
  it('หน้ารายละเอียดใช้ป้ายของประเภทหน้า และ /members/new ไม่ถูกมองเป็นโปรไฟล์', () => {
    expect(routeLabel('/members/01')?.en).toBe('Profile');
    expect(routeLabel('/members/new')?.en).toBe('New member');
    expect(routeLabel('/payments/subscriptions')?.en).toBe('Auto-renew');
    expect(routeLabel('/payments/p-101')?.en).toBe('Receipt');
  });
  it('หน้าสมาชิกและ login ใช้แถบเต็ม หน้าพนักงานใช้แถบเร็ว', () => {
    expect(routeLabel('/me/workout')?.full).toBe(true);
    expect(routeLabel('/login')?.full).toBe(true);
    expect(routeLabel('/payments')?.full).toBe(false);
  });
  it('ออกจากระบบไปหน้า login ไม่มีแถบเปลี่ยนหน้า', () => {
    expect(wipeLabelFor('/login')).toBeNull();
    expect(wipeLabelFor('/me')?.en).toBe('My card');
  });
  it('เมนูตั้งค่ามีแถบเปลี่ยนหน้า', () => {
    expect(wipeLabelFor('/users')?.en).toBe('Users');
    expect(wipeLabelFor('/roles')?.th).toBe('บทบาทและสิทธิ์');
    expect(wipeLabelFor('/branding')?.en).toBe('Branding');
  });
  it('ลิงก์ที่ไม่ใช่หน้า (ดาวน์โหลด CSV) ไม่มีแถบ', () => {
    expect(routeLabel('/reports/export')).toBeNull();
  });
  it('เวลาแถบ: 1.5 วิทุกหน้า และแบ่งช่วงเข้า/ค้าง/ออกครบเวลา', () => {
    expect(WIPE_MS).toBe(1500);
    for (const full of [true, false]) {
      const t = wipeTiming(full);
      expect(t.total).toBe(WIPE_MS);
      expect(Math.abs(t.enter + t.hold + t.exit - t.total)).toBeLessThanOrEqual(1);
    }
  });
});
