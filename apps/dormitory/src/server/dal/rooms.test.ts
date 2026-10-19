import { describe, expect, it } from 'vitest';
import type { Session } from '../auth';
import { getRoom, getSummary, listInvoices, listRooms } from './rooms';

const manager: Session = { userId: 'u1', name: 'ผู้จัดการ', nickname: 'มน', role: 'manager', building: 'ทดสอบ' };
const tenant304: Session = { userId: 'u2', name: 'ผู้เช่า', nickname: 'พร', role: 'tenant', building: 'ทดสอบ', roomNo: 304 };

describe('สิทธิ์การเข้าถึงห้อง (§7.2)', () => {
  it('ผู้เช่าเห็นบิลห้องตัวเองได้', async () => {
    const room = await getRoom(tenant304, 304);
    expect(room?.total).toBe(606_400);
  });

  it('ผู้เช่าห้อง 304 เปิดบิลห้อง 202 ไม่ได้ (IDOR) และตอบเหมือนไม่มีห้อง', async () => {
    expect(await getRoom(tenant304, 202)).toBeNull();
    expect(await getRoom(tenant304, 999)).toBeNull();
  });

  it('ผู้เช่าเรียกรายการห้องหรือบิลทั้งหอไม่ได้', async () => {
    await expect(listRooms(tenant304)).rejects.toThrow('FORBIDDEN');
    await expect(listInvoices(tenant304)).rejects.toThrow('FORBIDDEN');
  });

  it('ผู้จัดการเห็นทุกห้อง', async () => {
    expect(await listRooms(manager)).toHaveLength(64);
  });
});

describe('สรุปยอด', () => {
  it('ยอดเรียกเก็บ = รับแล้ว + ค้างชำระ + รอตรวจสลิป', async () => {
    const s = await getSummary(manager);
    expect(s.billed).toBe(s.collected + s.overdue.amount + s.slip.amount);
    expect(s.occupied).toBe(58);
    expect(s.overdue.count).toBe(5);
  });

  it('ห้อง 207 คิดค่าไฟจากมิเตอร์วนรอบ 342 หน่วย', async () => {
    const room = await getRoom(manager, 207);
    expect(room?.electric?.units).toBe(342);
  });
});
