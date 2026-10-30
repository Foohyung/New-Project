import 'server-only';
import { addDays, normalizePhone } from '@/api/lib/utils/utils/utils';
import { compareMembers, daysLeft, isFrozenOn, memberCode, membershipStatus, planFreeze, planUnfreeze, type FreezeDecision, type MemberSort, type MembershipStatus } from '@/api/services/members/members/members.service';
import type { MemberDetailDto, MemberDto } from '@/api/types/members/members/members.types';
import { inRange, type DateRange } from '@/api/services/shared/shared/shared.date-range';
import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, bangkokSpan, nextNumber, packagesById, prismaAs, toMember, transaction, type MemberRecord, type PackageRecord, type Tx } from '@/api/lib/db/db/db';
import { authorize, can } from '@/api/lib/auth/auth/auth.rbac';
import { hashPassword } from '@/api/lib/auth/auth/auth.accounts';
import { normalizeIdentifier } from '@/api/services/auth/auth/auth.service';
import { kindFor, resolveCoupon } from '@/api/dal/coupons/coupons/coupons.dal';
import { createPaymentRecord, PAYMENT_INCLUDE, paymentDtos } from '@/api/dal/payments/payments/payments.dal';
import { decideCheckIn } from '@/api/services/checkin/checkin/checkin.service';

export type { MemberDto };

export function toMemberDto(m: MemberRecord, pkgs: Map<string, PackageRecord>, date: string): MemberDto {
  const frozen = isFrozenOn(m.freeze, date);
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    phone: m.phone,
    packageId: m.packageId,
    packageName: pkgs.get(m.packageId)?.name ?? m.packageId,
    expiresOn: m.expiresOn,
    daysLeft: daysLeft({ expiresOn: m.expiresOn, frozen }, date),
    status: membershipStatus({ expiresOn: m.expiresOn, frozen }, date),
    lastCheckInAt: m.lastCheckInAt,
    ptSessionsLeft: m.ptSessionsLeft,
    joinedOn: m.joinedOn,
  };
}

export async function listMembers(session: Session, filter: { status?: MembershipStatus; q?: string; packageId?: string; sort?: MemberSort; expires?: DateRange | null } = {}): Promise<MemberDto[]> {
  await authorize(session, 'members.view');
  const db = prismaAs(session);
  const date = today();
  const q = filter.q?.trim().toLowerCase();
  const digits = q ? normalizePhone(q) : '';
  const [rows, pkgs] = await Promise.all([db.member.findMany({ where: filter.packageId ? { packageId: filter.packageId } : {} }), packagesById(db)]);
  // สถานะ (ใกล้หมด/พักอยู่) คิดจากวันที่วันนี้ จึงกรองหลังแปลงเป็น DTO
  return rows
    .map(r => toMemberDto(toMember(r), pkgs, date))
    .filter(m => !filter.status || m.status === filter.status)
    .filter(m => inRange(m.expiresOn, filter.expires ?? null))
    .filter(m => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (digits.length >= 3 && m.phone.includes(digits)))
    .sort(compareMembers(filter.sort ?? 'expires'));
}

export async function countByStatus(session: Session): Promise<Record<MembershipStatus | 'all', number>> {
  const all = await listMembers(session);
  const counts = { all: all.length, active: 0, expiring: 0, expired: 0, frozen: 0 };
  for (const m of all) counts[m.status]++;
  return counts;
}

async function findByQuery(db: Tx, query: string): Promise<MemberRecord | undefined> {
  const phone = normalizePhone(query);
  const code = query.trim().toUpperCase();
  const row = await db.member.findFirst({ where: { OR: [{ phone }, { code }] } });
  return row ? toMember(row) : undefined;
}

/** หาสมาชิกจากเบอร์โทรหรือรหัสสมาชิกแบบตรงตัว (ใช้ตอนจองคลาส/PT ให้สมาชิก) */
export async function findMember(session: Session, query: string): Promise<MemberDto | undefined> {
  await authorize(session, 'members.view');
  const db = prismaAs(session);
  const found = await findByQuery(db, query);
  return found && toMemberDto(found, await packagesById(db), today());
}

export async function getMemberDetail(session: Session, id: string): Promise<MemberDetailDto | null> {
  await authorize(session, 'members.view');
  const db = prismaAs(session);
  const row = await db.member.findUnique({ where: { id } });
  if (!row) return null;
  const m = toMember(row);
  const date = today();
  const instant = now();
  const [pkgs, payments, checkIns, bookings, ptSessions] = await Promise.all([
    packagesById(db),
    db.payment.findMany({ where: { memberId: id }, include: PAYMENT_INCLUDE, orderBy: { createdAt: 'desc' } }),
    db.checkIn.findMany({ where: { memberId: id }, orderBy: { at: 'desc' }, take: 10 }),
    db.booking.findMany({ where: { memberId: id, status: 'booked', class: { startsAt: { gte: instant } } }, include: { class: true }, orderBy: { class: { startsAt: 'asc' } } }),
    db.ptSession.findMany({ where: { memberId: id }, include: { trainer: { select: { nickname: true } } }, orderBy: { startsAt: 'desc' }, take: 6 }),
  ]);
  return {
    ...toMemberDto(m, pkgs, date),
    email: m.email,
    note: m.note,
    freeze: m.freeze && m.freeze.until >= date ? m.freeze : null,
    checkIns: checkIns.map(c => ({ at: c.at.toISOString(), allowed: c.allowed })),
    bookings: bookings.map(b => ({ id: b.id, classId: b.classId, title: b.class.title, startsAt: b.class.startsAt.toISOString(), room: b.class.room })),
    ptSessions: ptSessions.map(s => ({ id: s.id, trainerName: s.trainer.nickname, startsAt: s.startsAt.toISOString(), status: s.status })),
    payments: can(session, 'payments.view') ? paymentDtos(payments, pkgs) : null,
    pendingPaymentId: payments.find(p => p.status !== 'paid')?.id ?? null,
  };
}

/** เช็กอินที่เคาน์เตอร์ */
export async function findMemberForCheckIn(session: Session, query: string): Promise<(MemberDto & { frozen: boolean }) | undefined> {
  await authorize(session, 'checkin.use');
  const db = prismaAs(session);
  const found = await findByQuery(db, query);
  const date = today();
  return found && { ...toMemberDto(found, await packagesById(db), date), frozen: isFrozenOn(found.freeze, date) };
}

export async function recordCheckIn(session: Session, memberId: string, allowed: boolean, at: Date): Promise<void> {
  await authorize(session, 'checkin.use');
  await transaction(session, async tx => {
    await tx.checkIn.create({ data: { memberId, at, allowed } });
    if (allowed) await tx.member.update({ where: { id: memberId }, data: { lastCheckInAt: at } });
  });
}

/** เช็กอินซ้ำภายในกี่นาทีถือว่าเป็นครั้งเดิม (กดปุ่มซ้ำ/เน็ตช้า ไม่นับเพิ่ม) */
export const SELF_CHECKIN_REPEAT_MINUTES = 60;

export type SelfCheckInResult =
  | { allowed: true; at: Date; daysLeft: number; repeated: boolean }
  | { allowed: false; reason: 'not-found' | 'expired' | 'frozen' };

/**
 * สมาชิกเช็กอินเองจากปุ่มในหน้าบัตรสมาชิก — ใช้ memberId จาก session เท่านั้น (กัน IDOR)
 * กติกาเดียวกับเคาน์เตอร์ (หมดอายุ/พักสมาชิก = ไม่ผ่าน) · กดซ้ำภายใน 60 นาทีไม่บันทึกเพิ่ม
 */
export async function selfCheckIn(session: Session, at: Date): Promise<SelfCheckInResult> {
  await authorize(session, 'portal.use');
  if (!session.memberId) return { allowed: false, reason: 'not-found' };
  const memberId = session.memberId;
  return transaction(session, async tx => {
    const row = await tx.member.findUnique({ where: { id: memberId } });
    if (!row) return { allowed: false, reason: 'not-found' } as const;
    const record = toMember(row);
    const date = today();
    const decision = decideCheckIn({ expiresOn: record.expiresOn, frozen: isFrozenOn(record.freeze, date) }, date);
    if (!decision.allowed) {
      await tx.checkIn.create({ data: { memberId, at, allowed: false } });
      return decision;
    }
    const recent = await tx.checkIn.findFirst({ where: { memberId, allowed: true, at: { gte: new Date(at.getTime() - SELF_CHECKIN_REPEAT_MINUTES * 60_000) } }, orderBy: { at: 'desc' } });
    if (recent) return { allowed: true, at: recent.at, daysLeft: decision.daysLeft, repeated: true } as const;
    await tx.checkIn.create({ data: { memberId, at, allowed: true } });
    await tx.member.update({ where: { id: memberId }, data: { lastCheckInAt: at } });
    return { allowed: true, at, daysLeft: decision.daysLeft, repeated: false } as const;
  });
}

export interface CheckInFeedItem {
  memberId: string;
  name: string;
  packageName: string;
  at: string;
  allowed: boolean;
  status: MembershipStatus;
  expiresOn: string;
}

export async function recentCheckIns(session: Session, limit = 6): Promise<CheckInFeedItem[]> {
  await authorize(session, 'members.view');
  const db = prismaAs(session);
  const date = today();
  const [rows, pkgs] = await Promise.all([db.checkIn.findMany({ orderBy: { at: 'desc' }, take: limit, include: { member: true } }), packagesById(db)]);
  return rows.map(c => {
    const dto = toMemberDto(toMember(c.member), pkgs, date);
    return { memberId: c.memberId, name: dto.name, packageName: dto.packageName, at: c.at.toISOString(), allowed: c.allowed, status: dto.status, expiresOn: dto.expiresOn };
  });
}

export async function checkInsToday(session: Session): Promise<number> {
  await authorize(session, 'members.view');
  return prismaAs(session).checkIn.count({ where: { allowed: true, at: bangkokSpan(today()) } });
}

export class PhoneTakenError extends Error {
  constructor() {
    super('PHONE_TAKEN');
  }
}

export interface MemberInput {
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
}

/**
 * สมัครสมาชิก + รายการชำระ · ส่ง password มา = สร้างบัญชีเข้าสู่ระบบของสมาชิกด้วย (เข้าด้วยเบอร์โทร role member สาขาเดียวกับผู้สมัครให้)
 */
export async function createMember(session: Session, input: MemberInput & { packageId: string; method: PaymentMethod; couponCode: string | null; marketingConsent: boolean; password?: string }): Promise<{ memberId: string; paymentId: string; paid: boolean }> {
  await authorize(session, 'members.manage');
  await authorize(session, 'payments.collect');
  return transaction(session, async tx => {
    if (await tx.member.findUnique({ where: { phone: input.phone } })) throw new PhoneTakenError();
    const pkg = await tx.package.findUnique({ where: { id: input.packageId } });
    if (!pkg) throw new Error('NOT_FOUND');
    const kind = kindFor(pkg.kind, true);
    // ตรวจคูปองก่อนสร้างสมาชิก — โค้ดใช้ไม่ได้ทั้ง transaction ถูกยกเลิก ไม่มีสมาชิกค้าง
    const coupon = input.couponCode ? await resolveCoupon(tx, input.couponCode, { memberId: null, packageId: input.packageId, kind }) : null;
    const member = await tx.member.create({
      data: {
        code: memberCode(await nextNumber(tx, 'member')),
        name: input.name,
        phone: input.phone,
        email: input.email,
        joinedOn: asDay(today()),
        packageId: input.packageId,
        // ยังไม่ได้ชำระ = ยังไม่มีสิทธิ์ (วันหมดอายุเป็นเมื่อวาน) จนกว่าการชำระจะยืนยัน
        expiresOn: asDay(addDays(today(), -1)),
        note: input.note,
        marketingConsent: input.marketingConsent,
      },
    });
    if (input.password) {
      const login = normalizeIdentifier(input.phone);
      // เบอร์นี้ถูกใช้เป็นชื่อเข้าสู่ระบบของบัญชีอื่นแล้ว — ยกเลิกทั้ง transaction ไม่มีสมาชิกค้าง
      if (await tx.user.findUnique({ where: { login } })) throw new Error('MEMBER_LOGIN_TAKEN');
      await tx.user.create({
        data: {
          login,
          passwordHash: hashPassword(input.password),
          role: 'member',
          name: input.name,
          nickname: input.name.split(/\s+/)[0] ?? input.name,
          branch: session.branch,
          memberId: member.id,
          // รหัสเริ่มต้นเหมือนกันทุกคน — บังคับเปลี่ยนตอนเข้าสู่ระบบครั้งแรก
          mustChangePassword: true,
          createdById: session.userId,
          createdByName: session.name,
          updatedById: session.userId,
          updatedByName: session.name,
        },
      });
    }
    const payment = await createPaymentRecord(tx, { memberId: member.id, packageId: input.packageId, kind, method: input.method, receivedBy: session.name, coupon });
    return { memberId: member.id, paymentId: payment.id, paid: payment.status === 'paid' };
  });
}

export async function updateMember(session: Session, id: string, input: MemberInput): Promise<void> {
  await authorize(session, 'members.manage');
  await transaction(session, async tx => {
    if (!(await tx.member.findUnique({ where: { id } }))) throw new Error('NOT_FOUND');
    if (await tx.member.findFirst({ where: { phone: input.phone, id: { not: id } } })) throw new PhoneTakenError();
    await tx.member.update({ where: { id }, data: input });
  });
}

/** ใครลบสมาชิกได้ — ลบแล้วประวัติชำระเงิน/ใบเสร็จหายด้วย จึงจำกัดที่ admin และเจ้าของ */
export function canDeleteMember(session: Session): boolean {
  return can(session, 'members.manage') && (session.role === 'admin' || session.role === 'owner');
}

/**
 * ลบสมาชิกถาวร พร้อมข้อมูลที่ผูกอยู่: บัญชีเข้าสู่ระบบของสมาชิก การชำระเงิน/ใบเสร็จ
 * (เช็กอิน การจอง PT การแจ้งเตือน ถูกลบตาม cascade · คูปองที่ถือคงอยู่แต่ไม่มีเจ้าของ)
 * คืนข้อมูลสรุปไว้บันทึก audit log ก่อนหาย
 */
export async function deleteMember(session: Session, id: string): Promise<{ code: string; name: string; phone: string; payments: number }> {
  await authorize(session, 'members.manage');
  if (!canDeleteMember(session)) throw new Error('FORBIDDEN');
  return transaction(session, async tx => {
    const m = await tx.member.findUnique({ where: { id }, select: { code: true, name: true, phone: true, _count: { select: { payments: true } } } });
    if (!m) throw new Error('NOT_FOUND');
    await tx.user.deleteMany({ where: { memberId: id } });
    await tx.payment.deleteMany({ where: { memberId: id } });
    await tx.member.delete({ where: { id } });
    return { code: m.code, name: m.name, phone: m.phone, payments: m._count.payments };
  });
}

export async function renewMember(session: Session, id: string, packageId: string, method: PaymentMethod, couponCode: string | null = null): Promise<{ paymentId: string; paid: boolean }> {
  await authorize(session, 'members.manage');
  await authorize(session, 'payments.collect');
  return transaction(session, async tx => {
    const m = await tx.member.findUnique({ where: { id } });
    const pkg = await tx.package.findFirst({ where: { id: packageId, active: true } });
    if (!m || !pkg) throw new Error('NOT_FOUND');
    const kind = kindFor(pkg.kind, false);
    const coupon = couponCode ? await resolveCoupon(tx, couponCode, { memberId: m.id, packageId: pkg.id, kind }) : null;
    const payment = await createPaymentRecord(tx, { memberId: m.id, packageId: pkg.id, kind, method, receivedBy: session.name, coupon });
    return { paymentId: payment.id, paid: payment.status === 'paid' };
  });
}

export async function freezeMember(session: Session, id: string, days: number): Promise<FreezeDecision> {
  await authorize(session, 'members.manage');
  const db = prismaAs(session);
  const row = await db.member.findUnique({ where: { id } });
  if (!row) throw new Error('NOT_FOUND');
  const decision = planFreeze(toMember(row), today(), days);
  if (decision.ok) {
    await db.member.update({ where: { id }, data: { freezeFrom: asDay(decision.freeze.from), freezeUntil: asDay(decision.freeze.until), expiresOn: asDay(decision.expiresOn) } });
  }
  return decision;
}

export async function unfreezeMember(session: Session, id: string): Promise<void> {
  await authorize(session, 'members.manage');
  const db = prismaAs(session);
  const row = await db.member.findUnique({ where: { id } });
  const m = row ? toMember(row) : null;
  if (!m?.freeze) throw new Error('NOT_FOUND');
  const { expiresOn } = planUnfreeze({ expiresOn: m.expiresOn, freeze: m.freeze }, today());
  await db.member.update({ where: { id }, data: { expiresOn: asDay(expiresOn), freezeFrom: null, freezeUntil: null } });
}
