import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USERS } from '../auth';
import { db, resetStore } from '../db';
import { listCoupons, myReferral, previewCoupon } from './coupons';
import { createMember, getMemberDetail, renewMember } from './members';
import { getPayment } from './payments';
import { getReminderCenter, runReminders, sendManualReminder } from './reminders';
import { getRetention, giveWinbackCoupon } from './retention';
import { getMyAutoRenew, getSubscriptionOverview, runBilling, setMyAutoRenew } from './subscriptions';

const { manager, member, owner } = DEMO_USERS;
const frontDesk = DEMO_USERS['front-desk'];
const newbie = { name: 'ทดสอบ คูปอง', phone: '0899999998', email: null, note: null, marketingConsent: true };

beforeEach(() => {
  resetStore();
});

describe('คูปอง', () => {
  it('ต่ออายุด้วย RENEW10 หักส่วนลด จองสิทธิ์ และใช้ซ้ำไม่ได้', async () => {
    const { paymentId } = await renewMember(frontDesk, '02', 'monthly', 'cash', 'renew10');
    expect(await getPayment(manager, paymentId)).toMatchObject({ listPriceSatang: 120_000, discountSatang: 12_000, amountSatang: 108_000, couponCode: 'RENEW10' });
    expect(db().coupons.find(c => c.code === 'RENEW10')?.used).toBe(47);
    await expect(renewMember(frontDesk, '02', 'monthly', 'cash', 'RENEW10')).rejects.toThrow('COUPON:already-used');
  });

  it('สมัครใหม่ด้วย WELCOME7 ได้วันเพิ่ม และ RENEW10 ใช้ตอนสมัครไม่ได้', async () => {
    await expect(createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'RENEW10' })).rejects.toThrow('COUPON:renew-only');
    expect(db().members.some(m => m.phone === newbie.phone)).toBe(false); // โค้ดผิดต้องไม่สร้างสมาชิกค้าง
    const { memberId } = await createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'WELCOME7' });
    expect((await getMemberDetail(manager, memberId))?.expiresOn).toBe('2026-11-21');
  });

  it('เพื่อนสมัครด้วยโค้ดชวนเพื่อน เจ้าของโค้ดได้ 7 วัน', async () => {
    const before = db().members.find(m => m.id === '02')?.expiresOn;
    await createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash', couponCode: 'FRIEND-1842' });
    expect(before).toBe('2026-10-18');
    expect(db().members.find(m => m.id === '02')?.expiresOn).toBe('2026-10-25');
  });

  it('ดูตัวอย่างส่วนลดได้ และบอกเหตุผลเมื่อใช้ไม่ได้', async () => {
    expect(await previewCoupon(frontDesk, { code: 'STUDENT', packageId: '3m', memberId: '03' })).toMatchObject({ ok: true, discountSatang: 20_000 });
    expect(await previewCoupon(frontDesk, { code: 'OCT-FLASH', packageId: '3m', memberId: '03' })).toMatchObject({ ok: false, message: 'โค้ดนี้หมดเขตแล้ว' });
    expect(await previewCoupon(frontDesk, { code: 'NOPE', packageId: '3m', memberId: null })).toMatchObject({ ok: false });
  });

  it('เคาน์เตอร์จัดการคูปองไม่ได้ สมาชิกมีโค้ดชวนเพื่อนของตัวเอง', async () => {
    await expect(listCoupons(frontDesk)).rejects.toThrow('FORBIDDEN');
    expect((await myReferral(member)).code).toBe('FRIEND-2318');
  });
});

describe('แจ้งเตือนต่ออายุ', () => {
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

describe('ตัดบัตรอัตโนมัติ', () => {
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

describe('สมาชิกเสี่ยงหลุด', () => {
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
