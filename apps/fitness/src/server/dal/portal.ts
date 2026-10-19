import 'server-only';
import { memberQrValue } from '@/features/members/service';
import type { MemberDto } from '@/features/members/types';
import type { PaymentDto } from '@/features/payments/types';
import type { Session } from '../auth';
import { now, today } from '../clock';
import { db } from '../db';
import { authorize } from '../rbac';
import { toMemberDto } from './members';
import { toPaymentDto } from './payments';

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
  const store = db();
  const m = store.members.find(x => x.id === session.memberId);
  if (!m) return null;
  const date = today();
  const instant = now().toISOString();
  const trainerName = (id: string) => store.trainers.find(t => t.id === id)?.nickname ?? '—';
  return {
    member: { ...toMemberDto(store, m, date), email: m.email, joinedOn: m.joinedOn, freezeUntil: m.freeze && m.freeze.until >= date ? m.freeze.until : null },
    qrValue: memberQrValue(m.code),
    bookings: store.bookings
      .filter(b => b.memberId === m.id && b.status === 'booked')
      .flatMap(b => {
        const c = store.classes.find(x => x.id === b.classId);
        return c && c.startsAt >= instant ? [{ id: b.id, classId: c.id, title: c.title, startsAt: c.startsAt, room: c.room, trainerName: trainerName(c.trainerId) }] : [];
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    ptSessions: store.ptSessions
      .filter(s => s.memberId === m.id && s.status === 'booked' && s.startsAt >= instant)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(s => ({ id: s.id, trainerName: trainerName(s.trainerId), startsAt: s.startsAt })),
    checkIns: store.checkIns.filter(c => c.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8).map(c => ({ at: c.at, allowed: c.allowed })),
    payments: store.payments.filter(p => p.memberId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(p => toPaymentDto(store, p)),
  };
}
