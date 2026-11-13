import { beforeEach, expect, it } from 'vitest';
import { getDashboard, getDashboardBranchScope } from '@/api/dal/dashboard/dashboard/dashboard.dal';
import { createManagedUser } from '@/api/dal/users/users/users.dal';
import { prisma } from '@/api/lib/db/db/db';
import { now } from '@/api/lib/clock/clock/clock';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

const { admin } = USERS;

beforeEach(resetDatabase, 30_000);

describeDb('แดชบอร์ดตามสาขา', () => {
  it('admin เลือกสาขาได้และตัวเลขนับเฉพาะรายการที่ผู้ใช้สาขานั้นสร้าง', async () => {
    const branch = 'สาขาแดชบอร์ดทดสอบ';
    const allBranches = await getDashboardBranchScope(admin);
    expect(allBranches.scope).toMatchObject({ branch: null, creatorIds: null });
    await prisma().branch.create({ data: { name: branch } });

    const creator = await createManagedUser(admin, {
      login: 'dashboard-branch@fitflow.test',
      password: 'long-enough-pass',
      name: 'ผู้ใช้ทดสอบ',
      nickname: 'ทดสอบ',
      role: 'front-desk',
      branch,
    });
    const member = await prisma().member.findFirst();
    if (!member) throw new Error('test database has no member');

    await prisma().checkIn.create({ data: { memberId: member.id, at: now(), allowed: true, createdById: creator.id } });

    const context = await getDashboardBranchScope(admin, branch);
    expect(context.branches).toContain(branch);
    expect(context.branches[0]).toBe(admin.branch);
    expect(context.branches.at(-1)).toBe(branch);
    expect(context.scope).toMatchObject({ branch, creatorIds: [creator.id] });
    const dashboard = await getDashboard(admin, context.scope);
    expect(dashboard.inGym.now).toBe(1);
    expect(dashboard.checkInsToday.count).toBe(1);
  });
});
