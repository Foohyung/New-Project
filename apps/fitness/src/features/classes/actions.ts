'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { bookClass, cancelBooking, createClass } from '@/server/dal/classes';
import { findMember } from '@/server/dal/members';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { ClassCreateSchema, MemberQuerySchema } from './schema';
import { BOOKING_REJECT, CANCEL_REJECT } from './service';

function refreshClass(classId: string) {
  revalidatePath('/classes');
  revalidatePath(`/classes/${classId}`);
  revalidatePath('/me');
  revalidatePath('/me/classes');
  revalidatePath('/');
}

/** เจ้าหน้าที่จองคลาสให้สมาชิกจากเบอร์โทรหรือรหัสสมาชิก */
export async function bookForMemberAction(classId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = MemberQuerySchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const member = await findMember(session, parsed.data.query);
    if (!member) return { ok: false, message: 'ไม่พบสมาชิก ตรวจเบอร์โทรหรือรหัสสมาชิกอีกครั้ง', fieldErrors: { query: 'ไม่พบสมาชิก' } };
    const decision = await bookClass(session, classId, member.id);
    if (!decision.ok) return { ok: false, message: BOOKING_REJECT[decision.reason] };
    await audit(session, 'class.book', 'class', classId);
    refreshClass(classId);
    return { ok: true, message: `จองให้ ${member.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** สมาชิกจองให้ตัวเอง (memberId มาจาก session เท่านั้น) */
export async function bookSelfAction(classId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (!session.memberId) return { ok: false, message: 'บัญชีนี้ไม่ได้ผูกกับสมาชิก' };
  try {
    const decision = await bookClass(session, classId, session.memberId);
    if (!decision.ok) return { ok: false, message: BOOKING_REJECT[decision.reason] };
    await audit(session, 'class.book.self', 'class', classId);
    refreshClass(classId);
    return { ok: true, message: 'จองแล้ว แสดงบัตรสมาชิกที่เคาน์เตอร์ก่อนเข้าคลาส' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function cancelBookingAction(bookingId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const decision = await cancelBooking(session, bookingId);
    if (!decision.ok) return { ok: false, message: CANCEL_REJECT };
    await audit(session, 'class.cancel', 'booking', bookingId);
    refreshClass(decision.classId ?? '');
    return { ok: true, message: 'ยกเลิกการจองแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function createClassAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ClassCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { date, time, ...rest } = parsed.data;
  let id: string;
  try {
    id = await createClass(session, { ...rest, startsAt: new Date(`${date}T${time}:00+07:00`).toISOString() });
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'class.create', 'class', id);
  revalidatePath('/classes');
  redirect(`/classes?from=${date}`);
}
