import 'server-only';
import { memberQrValue } from '@/api/services/members/members/members.service';
import type { MemberDto } from '@/api/types/members/members/members.types';
import type { PaymentDto } from '@/api/types/payments/payments/payments.types';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { packagesById, prismaAs, toMember } from '@/api/lib/db/db/db';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import { toMemberDto } from '@/api/dal/members/members/members.dal';
import { PAYMENT_INCLUDE, paymentDtos } from '@/api/dal/payments/payments/payments.dal';

export interface PortalDto {
  member: MemberDto & { email: string | null; joinedOn: string; freezeUntil: string | null };
  qrValue: string;
  bookings: { id: string; classId: string; title: string; startsAt: string; room: string; trainerName: string }[];
  ptSessions: { id: string; trainerName: string; startsAt: string }[];
  checkIns: { at: string; allowed: boolean }[];
  payments: PaymentDto[];
}

/** หน้าสมาชิก: เห็นได้เฉพาะข้อมูลของตัวเอง (memberId มาจาก session ไม่ใช่จาก URL — กัน IDOR) */
export async function getPortal(session: Session): Promise<PortalDto | null> {
  await authorize(session, 'portal.use');
  if (!session.memberId) return null;
  const db = prismaAs(session);
  const memberId = session.memberId;
  const row = await db.member.findUnique({ where: { id: memberId } });
  if (!row) return null;
  const m = toMember(row);
  const date = today();
  const instant = now();
  const [pkgs, bookings, ptSessions, checkIns, payments] = await Promise.all([
    packagesById(db),
    db.booking.findMany({ where: { memberId, status: 'booked', class: { startsAt: { gte: instant } } }, include: { class: { include: { trainer: { select: { nickname: true } } } } }, orderBy: { class: { startsAt: 'asc' } } }),
    db.ptSession.findMany({ where: { memberId, status: 'booked', startsAt: { gte: instant } }, include: { trainer: { select: { nickname: true } } }, orderBy: { startsAt: 'asc' } }),
    db.checkIn.findMany({ where: { memberId }, orderBy: { at: 'desc' }, take: 8 }),
    db.payment.findMany({ where: { memberId }, include: PAYMENT_INCLUDE, orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);
  return {
    member: { ...toMemberDto(m, pkgs, date), email: m.email, joinedOn: m.joinedOn, freezeUntil: m.freeze && m.freeze.until >= date ? m.freeze.until : null },
    qrValue: memberQrValue(m.code),
    bookings: bookings.map(b => ({ id: b.id, classId: b.classId, title: b.class.title, startsAt: b.class.startsAt.toISOString(), room: b.class.room, trainerName: b.class.trainer.nickname })),
    ptSessions: ptSessions.map(s => ({ id: s.id, trainerName: s.trainer.nickname, startsAt: s.startsAt.toISOString() })),
    checkIns: checkIns.map(c => ({ at: c.at.toISOString(), allowed: c.allowed })),
    payments: paymentDtos(payments, pkgs),
  };
}
