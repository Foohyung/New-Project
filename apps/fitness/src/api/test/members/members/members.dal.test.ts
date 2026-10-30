import { beforeEach, expect, it } from 'vitest';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma } from '@/api/lib/db/db/db';
import { bookClass, cancelBooking, getClassDetail } from '@/api/dal/classes/classes/classes.dal';
import { getDashboard } from '@/api/dal/dashboard/dashboard/dashboard.dal';
import { createMember, deleteMember, findMemberForCheckIn, selfCheckIn, freezeMember, getMemberDetail, listMembers, renewMember, unfreezeMember } from '@/api/dal/members/members/members.dal';
import { confirmPayment, getPayment, submitSlip } from '@/api/dal/payments/payments/payments.dal';
import { getPortal } from '@/api/dal/portal/portal/portal.dal';
import { bookPt, completePt } from '@/api/dal/trainers/trainers/trainers.dal';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

const { owner, manager, trainer, member } = USERS;
const frontDesk = USERS['front-desk'];

beforeEach(resetDatabase, 30_000);

describeDb('สิทธิ์ (§7.2, §10.2)', () => {
  it('เทรนเนอร์ไม่มีแดชบอร์ด และเคาน์เตอร์ไม่เห็นรายได้', async () => {
    await expect(getDashboard(trainer)).rejects.toThrow('FORBIDDEN');
    expect((await getDashboard(frontDesk)).revenueMonth).toBeNull();
    expect((await getDashboard(manager)).revenueMonth?.satang).toBeGreaterThan(0);
  });

  it('สมาชิกดูรายชื่อสมาชิกคนอื่นไม่ได้', async () => {
    await expect(listMembers(member)).rejects.toThrow('FORBIDDEN');
    await expect(getMemberDetail(member, '02')).rejects.toThrow('FORBIDDEN');
  });

  it('สมาชิกเปิดใบเสร็จของคนอื่นไม่ได้ (IDOR) แต่เปิดของตัวเองได้', async () => {
    const other = await prisma().payment.findFirst({ where: { memberId: { not: member.memberId } } });
    expect(other).toBeDefined();
    expect(await getPayment(member, other?.id ?? '')).toBeNull();
    const { paymentId } = await renewMember(manager, member.memberId ?? '', 'monthly', 'promptpay');
    expect((await getPayment(member, paymentId))?.memberId).toBe(member.memberId);
  });

  it('เทรนเนอร์และเคาน์เตอร์ยืนยันเงินเข้าไม่ได้ เฉพาะผู้จัดการ/เจ้าของ', async () => {
    await expect(confirmPayment(trainer, 'p-107')).rejects.toThrow('FORBIDDEN');
    await expect(confirmPayment(frontDesk, 'p-107')).rejects.toThrow('FORBIDDEN');
    await expect(confirmPayment(owner, 'p-107')).resolves.toMatchObject({ status: 'paid' });
  });

  it('สมาชิกจองคลาสให้คนอื่นไม่ได้', async () => {
    await expect(bookClass(member, 'yoga-flow-2026-10-15', '02')).rejects.toThrow('FORBIDDEN');
    await expect(bookClass(member, 'yoga-flow-2026-10-15', member.memberId ?? '')).resolves.toEqual({ ok: true });
  });

  it('เทรนเนอร์จัดการได้เฉพาะคิว PT ของตัวเอง', async () => {
    await expect(bookPt(trainer, 't4', '03', '2026-10-17T10:00:00Z')).rejects.toThrow('FORBIDDEN');
    await expect(bookPt(trainer, 't1', '03', '2026-10-17T10:00:00Z')).resolves.toEqual({ ok: true });
  });

  it('หน้าสมาชิกคืนเฉพาะข้อมูลของ session (ไม่รับ id จากภายนอก)', async () => {
    expect((await getPortal(member))?.member.code).toBe('FF-002318');
    await expect(getPortal(manager)).rejects.toThrow('FORBIDDEN');
  });
});

describeDb('ค้นหาสมาชิก', () => {
  it('ค้นจากเบอร์โทรที่มีขีดหรือรหัสสมาชิกได้', async () => {
    expect((await findMemberForCheckIn(manager, '080-000-0101'))?.code).toBe('FF-002318');
    expect((await findMemberForCheckIn(manager, 'ff-002318'))?.name).toBe('ณัฐพล ศรีสุข');
  });

  it('กรองตามสถานะ และสมาชิกที่พักอยู่มีสถานะ frozen', async () => {
    const expiring = await listMembers(manager, { status: 'expiring' });
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring.every(m => m.status === 'expiring')).toBe(true);
    expect((await listMembers(manager, { status: 'frozen' })).map(m => m.code)).toContain('FF-001377');
  });
});

describeDb('สมัครและต่ออายุ', () => {
  const newbie = { name: 'ทดสอบ ระบบ', phone: '0899999999', email: null, note: null, couponCode: null, marketingConsent: true };

  it('จ่ายเงินสดแล้วสมาชิกใช้งานได้ทันที', async () => {
    const { memberId, paid } = await createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'cash' });
    expect(paid).toBe(true);
    expect(await getMemberDetail(frontDesk, memberId)).toMatchObject({ status: 'active', expiresOn: '2026-11-14' });
  });

  it('จ่าย PromptPay ต้องรอยืนยันก่อนจึงจะเช็กอินได้', async () => {
    const { memberId, paymentId, paid } = await createMember(frontDesk, { ...newbie, packageId: 'monthly', method: 'promptpay' });
    expect(paid).toBe(false);
    expect((await getMemberDetail(manager, memberId))?.status).toBe('expired');
    await confirmPayment(manager, paymentId);
    expect((await getMemberDetail(manager, memberId))?.status).toBe('active');
    // ยืนยันซ้ำต้องไม่ต่ออายุซ้ำ (idempotent)
    await confirmPayment(manager, paymentId);
    expect((await getMemberDetail(manager, memberId))?.expiresOn).toBe('2026-11-14');
  });

  it('เบอร์ซ้ำสมัครไม่ได้', async () => {
    await expect(createMember(frontDesk, { ...newbie, phone: '0800000101', packageId: 'monthly', method: 'cash' })).rejects.toThrow('PHONE_TAKEN');
  });

  it('ต่ออายุก่อนหมดอายุ ต่อจากวันหมดอายุเดิม', async () => {
    await renewMember(manager, '02', 'monthly', 'card'); // เดิมหมด 18 ต.ค.
    expect((await getMemberDetail(manager, '02'))?.expiresOn).toBe('2026-11-18');
  });

  it('สมาชิกแจ้งโอนแล้ว สถานะเปลี่ยนเป็นรอตรวจ', async () => {
    const { paymentId } = await renewMember(manager, member.memberId ?? '', 'monthly', 'promptpay');
    await expect(submitSlip(member, paymentId)).resolves.toMatchObject({ status: 'review' });
  });
});

describeDb('พักสมาชิก', () => {
  it('พักแล้วเช็กอินไม่ได้ และยกเลิกพักคืนวันที่ไม่ได้ใช้', async () => {
    const decision = await freezeMember(manager, '01', 14);
    expect(decision.ok).toBe(true);
    expect((await findMemberForCheckIn(manager, 'FF-002318'))?.frozen).toBe(true);
    await unfreezeMember(manager, '01');
    expect((await getMemberDetail(manager, '01'))?.expiresOn).toBe('2027-08-12');
  });
});

describeDb('จองคลาส', () => {
  it('คลาสเต็มจองไม่ได้ และยกเลิกแล้วมีที่ว่างคืน', async () => {
    // Spin วันนี้เต็ม 20/20
    expect(await bookClass(frontDesk, 'spin-2026-10-15', '02')).toEqual({ ok: false, reason: 'full' });
    const booking = await prisma().booking.findFirst({ where: { classId: 'spin-2026-10-15', status: 'booked' } });
    await expect(cancelBooking(frontDesk, booking?.id ?? '')).resolves.toMatchObject({ ok: true });
    expect(await bookClass(frontDesk, 'spin-2026-10-15', '02')).toEqual({ ok: true });
    expect((await getClassDetail(manager, 'spin-2026-10-15'))?.booked).toBe(20);
  });

  it('สมาชิกหมดอายุจองคลาสไม่ได้', async () => {
    expect(await bookClass(frontDesk, 'yoga-flow-2026-10-15', '05')).toEqual({ ok: false, reason: 'inactive' });
  });

  it('สมาชิกยกเลิกเองไม่ได้เมื่อเหลือน้อยกว่า 2 ชั่วโมง', async () => {
    await bookClass(member, 'yoga-flow-2026-10-15', member.memberId ?? '');
    const mine = await prisma().booking.findFirst({ where: { classId: 'yoga-flow-2026-10-15', memberId: member.memberId, status: 'booked' } });
    await expect(cancelBooking(member, mine?.id ?? '')).resolves.toMatchObject({ ok: false, reason: 'too-late' });
  });
});

describeDb('PT', () => {
  it('เทรนเสร็จแล้วหักครั้งของสมาชิก', async () => {
    const session: Session = { ...frontDesk };
    await completePt(session, 'pt-4');
    expect((await getMemberDetail(manager, '06'))?.ptSessionsLeft).toBe(4);
  });

  it('ลบสมาชิก: เฉพาะ admin/เจ้าของ และลบบัญชีเข้าสู่ระบบ + การชำระเงินไปด้วย', async () => {
    await expect(deleteMember(manager, '01')).rejects.toThrow('FORBIDDEN');
    await expect(deleteMember(frontDesk, '01')).rejects.toThrow('FORBIDDEN');
    const removed = await deleteMember(owner, '01');
    expect(removed.name).toBeTruthy();
    expect(await getMemberDetail(owner, '01')).toBeNull();
    expect(await prisma().user.count({ where: { memberId: '01' } })).toBe(0);
    expect(await prisma().payment.count({ where: { memberId: '01' } })).toBe(0);
    await expect(deleteMember(owner, '01')).rejects.toThrow('NOT_FOUND');
  });

  it('สมัครพร้อมตั้งรหัสผ่าน = สร้างบัญชีสมาชิกเข้าด้วยเบอร์โทร', async () => {
    const newbie = { name: 'ทดสอบ ระบบ', email: null, note: null, couponCode: null, marketingConsent: true };
    const { memberId } = await createMember(frontDesk, { ...newbie, phone: '0899990001', packageId: 'monthly', method: 'cash', password: 'member-pass' });
    const user = await prisma().user.findUnique({ where: { login: '0899990001' } });
    expect(user).toMatchObject({ role: 'member', memberId, branch: frontDesk.branch, mustChangePassword: true });
    // เบอร์ซ้ำกับชื่อเข้าสู่ระบบที่มีอยู่ → ยกเลิกทั้งรายการ
    await prisma().member.update({ where: { id: memberId }, data: { phone: '0899990002' } });
    await expect(createMember(frontDesk, { ...newbie, phone: '0899990001', packageId: 'monthly', method: 'cash', password: 'x' })).rejects.toThrow('MEMBER_LOGIN_TAKEN');
    expect(await prisma().member.count({ where: { phone: '0899990001' } })).toBe(0);
  });

  it('สมาชิกเช็กอินเอง: ใช้ memberId จาก session · กดซ้ำใน 60 นาทีไม่บันทึกเพิ่ม · พนักงานใช้ไม่ได้', async () => {
    const before = await prisma().checkIn.count({ where: { memberId: '01' } });
    const first = await selfCheckIn(member, new Date('2026-10-15T11:00:00Z'));
    expect(first).toMatchObject({ allowed: true, repeated: false });
    const again = await selfCheckIn(member, new Date('2026-10-15T11:30:00Z'));
    expect(again).toMatchObject({ allowed: true, repeated: true });
    expect(await prisma().checkIn.count({ where: { memberId: '01' } })).toBe(before + 1);
    await expect(selfCheckIn(frontDesk, new Date())).rejects.toThrow('FORBIDDEN');
  });
});
