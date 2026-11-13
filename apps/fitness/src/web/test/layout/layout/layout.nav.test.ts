import { describe, expect, it } from 'vitest';
import { groupsFor, navFor } from '@/web/components/layout/layout/layout.nav';

describe('เมนูสมาชิก', () => {
  it('แสดงหมวดสินค้าและลิงก์ซื้อสินค้า โดยไม่แสดงเมนูจัดการสต็อก', () => {
    const shop = groupsFor('member').find(group => group.id === 'shop');
    expect(shop?.label).toBe('สินค้า');
    expect(shop?.items.map(item => item.label)).toEqual(['ซื้อสินค้า']);
    expect(navFor('member').find(item => item.href === '/sales')).toMatchObject({
      label: 'ซื้อสินค้า',
      short: 'ซื้อสินค้า',
      primary: true,
    });
  });

  describe('เมนูตั้งค่า', () => {
    it('แสดงคำขอรีเซ็ตรหัสผ่านให้ role ที่จัดการบัญชีได้เท่านั้น', () => {
      const items = groupsFor('admin').find(group => group.id === 'admin')?.items ?? [];
      expect(items).toContainEqual(
        expect.objectContaining({ href: '/password-resets', label: 'คำขอรีเซ็ตรหัสผ่าน', permission: 'users.manage' }),
      );
      expect(items.findIndex(item => item.href === '/password-resets')).toBe(items.findIndex(item => item.href === '/access-logs') - 1);
      expect(groupsFor('owner').find(group => group.id === 'admin')?.items.map(item => item.href)).toContain('/password-resets');
      expect(groupsFor('admin').find(group => group.id === 'admin')?.items.map(item => item.href)).toContain('/payment-settings');
      expect(groupsFor('owner').find(group => group.id === 'admin')?.items.map(item => item.href)).toContain('/payment-settings');
      expect(groupsFor('front-desk').find(group => group.id === 'admin')).toBeUndefined();
    });
  });

  it('ใช้ชื่อสินค้าและซื้อสินค้าเหมือนกันทุกบทบาทที่มีสิทธิ์ซื้อ', () => {
    const shop = groupsFor('front-desk').find(group => group.id === 'shop');
    expect(shop?.label).toBe('สินค้า');
    expect(shop?.items.map(item => item.label)).toEqual(['ซื้อสินค้า']);
  });
});
