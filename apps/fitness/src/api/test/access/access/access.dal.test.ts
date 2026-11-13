import { beforeEach, expect, it } from 'vitest';
import { getAccessLog } from '@/api/dal/access/access/access.dal';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma } from '@/api/lib/db/db/db';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

const owner: Session = {
  userId: 'owner-1',
  name: 'เจ้าของ',
  nickname: 'เจ้าของ',
  role: 'owner',
  branch: 'สาขาหลัก',
  permissions: ['access.view'],
};

it('ปฏิเสธการอ่านประวัติเข้าสู่ระบบของทุก role ที่ไม่ใช่ admin แม้มีสิทธิ์ access.view ค้างอยู่', async () => {
  await expect(getAccessLog({ ...owner, permissions: [] }, { from: '2026-11-01', to: '2026-11-01' })).rejects.toThrow('FORBIDDEN');
  await expect(getAccessLog(owner, { from: '2026-11-01', to: '2026-11-01' })).rejects.toThrow('FORBIDDEN');
});

describeDb('แบ่งหน้าประวัติการเข้าสู่ระบบ', () => {
  beforeEach(resetDatabase, 30_000);

  it('แสดงไม่เกิน 10 รายการต่อหน้าและคงยอดรวมของทุกหน้า', async () => {
    await prisma().auditLog.createMany({
      data: Array.from({ length: 16 }, (_, index) => ({
        occurredAt: new Date(Date.UTC(2026, 10, index < 13 ? 1 : 2, 0, index)),
        actorId: USERS.admin.userId,
        actorName: USERS.admin.name,
        actorRole: 'admin',
        action: index % 2 === 0 ? 'auth.login' : 'auth.logout',
        entityType: 'users',
        entityId: USERS.admin.userId,
        ip: `192.0.2.${index % 3 + 1}`,
      })),
    });

    const first = await getAccessLog(USERS.admin, { from: '2026-11-01', to: '2026-11-01' });
    const second = await getAccessLog(USERS.admin, { from: '2026-11-01', to: '2026-11-01', page: 2 });
    const beyondLast = await getAccessLog(USERS.admin, { from: '2026-11-01', to: '2026-11-01', page: 99 });
    const dateRange = await getAccessLog(USERS.admin, { from: '2026-11-01', to: '2026-11-02' });

    expect(first).toMatchObject({ page: 1, pageSize: 10, total: 13, totalPages: 2, logins: 7, logouts: 6, ipCount: 3 });
    expect(first.events).toHaveLength(10);
    expect(second).toMatchObject({ page: 2, total: 13, totalPages: 2 });
    expect(second.events).toHaveLength(3);
    expect(beyondLast.page).toBe(2);
    expect(beyondLast.events).toHaveLength(3);
    expect(dateRange.total).toBe(16);
    expect(dateRange.totalPages).toBe(2);
  });
});
