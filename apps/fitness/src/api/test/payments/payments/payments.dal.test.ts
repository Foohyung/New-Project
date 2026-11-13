import { beforeEach, expect, it } from 'vitest';
import { confirmPayment, getPayment, listPayments, paymentBranchOptions } from '@/api/dal/payments/payments/payments.dal';
import { prisma } from '@/api/lib/db/db/db';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

const OTHER = 'สาขาทดสอบ';
const otherDesk: Session = { userId: 'desk-other', name: 'เคาน์เตอร์สาขาอื่น', nickname: 'อื่น', role: 'front-desk', branch: OTHER };

describeDb('การเงินแยกตามสาขา', () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma().user.create({ data: { id: otherDesk.userId, login: 'desk-other@fitflow.test', passwordHash: 'x', role: 'front-desk', name: otherDesk.name, nickname: otherDesk.nickname, branch: OTHER } });
    await prisma().payment.create({
      data: { id: 'pay-other', receiptNo: 'RC-TEST-OTHER', memberId: '01', packageId: 'gold12', kind: 'renew', amountSatang: 100_00, listPriceSatang: 100_00, method: 'cash', status: 'pending', createdById: otherDesk.userId, createdByName: otherDesk.name },
    });
  }, 30_000);

  it('พนักงานเห็นเฉพาะรายการของสาขาตัวเอง และเปิด/ยืนยันใบของสาขาอื่นไม่ได้', async () => {
    const mine = await listPayments(USERS['front-desk']);
    expect(mine.some(p => p.id === 'pay-other')).toBe(false);
    expect(await getPayment(USERS['front-desk'], 'pay-other')).toBeNull();
    await expect(confirmPayment(USERS.manager, 'pay-other')).rejects.toThrow('FORBIDDEN');
    expect((await listPayments(otherDesk)).map(p => p.id)).toEqual(['pay-other']);
    expect(await paymentBranchOptions(USERS['front-desk'])).toEqual([]);
  });

  it('admin เห็นทุกสาขา และกรองทีละสาขาได้', async () => {
    const all = await listPayments(USERS.admin);
    expect(all.some(p => p.id === 'pay-other')).toBe(true);
    expect(await paymentBranchOptions(USERS.admin)).toContain(OTHER);
    expect((await listPayments(USERS.admin, { branch: OTHER })).map(p => p.id)).toEqual(['pay-other']);
    expect((await listPayments(USERS.admin, { branch: 'สาขาหลัก' })).some(p => p.id === 'pay-other')).toBe(false);
    // บทบาทอื่นส่ง branch มาก็ไม่มีผล
    expect((await listPayments(USERS['front-desk'], { branch: OTHER })).some(p => p.id === 'pay-other')).toBe(false);
  });
});
