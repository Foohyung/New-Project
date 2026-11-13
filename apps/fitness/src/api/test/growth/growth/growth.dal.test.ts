import { beforeEach, expect, it } from 'vitest';
import { prisma } from '@/api/lib/db/db/db';
import { listCoupons, previewCoupon, updateCoupon } from '@/api/dal/coupons/coupons/coupons.dal';
import { createMember, getMemberDetail, renewMember } from '@/api/dal/members/members/members.dal';
import { getPayment } from '@/api/dal/payments/payments/payments.dal';
import { getReminderCenter, runReminders, sendManualReminder } from '@/api/dal/reminders/reminders/reminders.dal';
import { getRetention, giveWinbackCoupon } from '@/api/dal/retention/retention/retention.dal';
import { getMyAutoRenew, getSubscriptionOverview, runBilling, setMyAutoRenew } from '@/api/dal/subscriptions/subscriptions/subscriptions.dal';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';
import { addDays } from '@/api/lib/utils/utils/utils';
import { today } from '@/api/lib/clock/clock/clock';

const { manager, member, owner } = USERS;
const frontDesk = USERS['front-desk'];
const newbie = { name: 'ทดสอบ คูปอง', phone: '0899999998', email: null, note: null, marketingConsent: true };

beforeEach(resetDatabase, 30_000);

describeDb('คูปอง', () => {
  it('แก้ไขเงื่อนไขและช่วงวันได้ และปฏิเสธโค้ดก่อนวันเริ่มใช้', async () => {
    const startsOn = addDays(today(), 1);
    const updated = await updateCoupon(manager, 'RENEW10', {
      description: 'ต่ออายุลดพิเศษ',
      type: 'percent',
      value: 15,
      packageIds: null,
      renewOnly: true,
      newOnly: false,
      limit: 47,
      startsOn,
      expiresOn: addDays(startsOn, 30),
      perMember: 2,
      terms: 'ใช้ได้ตามช่วงวัน',
      minMemberDays: null,
      proofRequired: null,
    });

    expect(updated).toMatchObject({ description: 'ต่ออายุลดพิเศษ', label: 'ลด 15%', startsOn, state: 'scheduled' });
    await expect(updateCoupon(manager, 'RENEW10', {
      description: 'จำกัดสิทธิ์',
      type: 'percent',
      value: 15,
      packageIds: null,
      renewOnly: true,
      newOnly: false,
      limit: 46,
      startsOn,
      expiresOn: addDays(startsOn, 30),
      perMember: 2,
      terms: null,
      minMemberDays: null,
      proofRequired: null,
    })).rejects.toThrow('COUPON_LIMIT_BELOW_USED');
  });

  it('ต่ออายุด้วย RENEW10 หักส่วนลด จองสิทธิ์ และใช้ซ้ำไม่ได้', async () => {
    const { paymentId } = await renewMember(frontDesk, '02', 'monthly', 'cash', 'renew10');
    expect(await getPayment(manager, paymentId)).toMatchObject({ listPriceSatang: 120_000, discountSatang: 12_000, amountSatang: 108_000, couponCode: 'RENEW10' });
    expect((await prisma().coupon.findUnique({ where: { code: 'RENEW10' } }))?.used).toBe(47);
    await expect(renewMember(frontDesk, '02', 'monthly', 'cash', 'RENEW10')).rejects.toThrow('COUPON:already-used');
  });

  it('สมัครใหม่ด้วย WELCOME7 ได้วันเพิ่ม และ RENEW10 ใช้ตอนสมัครไม่ได้', async () => {
    await expect(createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'RENEW10' })).rejects.toThrow('COUPON:renew-only');
    expect(await prisma().member.count({ where: { phone: newbie.phone } })).toBe(0); // โค้ดผิดต้องไม่สร้างสมาชิกค้าง
    const { memberId } = await createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'WELCOME7' });
    expect((await getMemberDetail(manager, memberId))?.expiresOn).toBe('2026-11-21');
  });

  it('โค้ดชวนเพื่อนปิดไว้ก่อน — โค้ดเดิมในฐานข้อมูลใช้ไม่ได้', async () => {
    await prisma().coupon.create({ data: { code: 'FRIEND-1842', description: 'ชวนเพื่อน (ปิดแล้ว)', type: 'baht', value: 20_000, kind: 'referral', newOnly: true, startsOn: new Date('2026-10-15T00:00:00Z'), ownerMemberId: '02' } });
    await expect(createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'FRIEND-1842' })).rejects.toThrow('COUPON:inactive');
  });

  it('ดูตัวอย่างส่วนลดได้ และบอกเหตุผลเมื่อใช้ไม่ได้', async () => {
    expect(await previewCoupon(frontDesk, { code: 'STUDENT', packageId: '3m', memberId: '03' })).toMatchObject({ ok: true, discountSatang: 20_000 });
    expect(await previewCoupon(frontDesk, { code: 'OCT-FLASH', packageId: '3m', memberId: '03' })).toMatchObject({ ok: false, message: 'โค้ดนี้หมดเขตแล้ว' });
    expect(await previewCoupon(frontDesk, { code: 'NOPE', packageId: '3m', memberId: null })).toMatchObject({ ok: false });
  });

  it('เคาน์เตอร์จัดการคูปองไม่ได้', async () => {
    await expect(listCoupons(frontDesk)).rejects.toThrow('FORBIDDEN');
  });
});

describeDb('แจ้งเตือนต่ออายุ', () => {
  it('ส่งรอบวันนี้เฉพาะคนที่ถึงรอบ และไม่ส่งซ้ำ', async () => {
    const center = await getReminderCenter(manager);
    expect(center.due.map(d => d.name)).toEqual(['พิมพ์ชนก วงศ์ดี']);
    expect(await runReminders(manager)).toBe(1);
    expect(await runReminders(manager)).toBe(0);
  });

  it('ไม่ส่งข้อความหาคนที่ไม่ยินยอมรับข่าวสาร', async () => {
    await expect(sendManualReminder(frontDesk, '08')).rejects.toThrow('NO_CONSENT');
  });
});

describeDb('ตัดบัตรอัตโนมัติ', () => {
  it('รอบวันนี้ลองตัดบัตรที่ไม่ผ่านอีกครั้ง และไม่ลองซ้ำในวันเดียวกัน', async () => {
    expect(await runBilling(manager)).toEqual({ charged: 0, failed: 1 });
    expect(await runBilling(manager)).toEqual({ charged: 0, failed: 0 });
    const overview = await getSubscriptionOverview(manager);
    expect(overview.problems.find(p => p.memberId === '09')).toMatchObject({ status: 'retrying', nextRetryOn: '2026-10-17' });
    expect(overview.upcoming.map(u => u.memberId)).toContain('07');
  });

  it('สมาชิกเปิดต่ออายุอัตโนมัติของตัวเองได้', async () => {
    await setMyAutoRenew(member, { enabled: false });
    expect((await getMyAutoRenew(member)).enabled).toBe(false);
    await setMyAutoRenew(member, { enabled: true, last4: '5454' });
    expect(await getMyAutoRenew(member)).toMatchObject({ enabled: true, card: { last4: '5454' } });
  });
});

describeDb('สมาชิกเสี่ยงหลุด', () => {
  it('จัดอันดับคนที่หายไปและใกล้หมดอายุไว้บนสุด ไม่รวมคนที่มาสม่ำเสมอ', async () => {
    const r = await getRetention(frontDesk);
    expect(r.atRisk[0]?.level).toBe('high');
    expect(r.atRisk.find(x => x.memberId === '09')?.level).toBe('high');
    expect(r.atRisk.some(x => x.memberId === '06')).toBe(false);
  });

  it('ให้คูปองดึงกลับแล้วย้ายไปติดต่อแล้ว และเมื่อต่ออายุย้ายไปกลับมาแล้ว', async () => {
    const code = await giveWinbackCoupon(frontDesk, '07');
    expect((await getRetention(owner)).board.contacted.some(x => x.memberId === '07')).toBe(true);
    await renewMember(frontDesk, '07', '3m', 'cash', code);
    expect((await getRetention(owner)).board.won.some(x => x.memberId === '07')).toBe(true);
  });
});
