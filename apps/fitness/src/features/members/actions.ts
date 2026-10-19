'use server';

import { formatThaiDate } from '@repo/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { createMember, freezeMember, getMemberDetail, renewMember, unfreezeMember, updateMember } from '@/server/dal/members';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { FreezeSchema, MemberCreateSchema, MemberFieldsSchema, RenewSchema } from './schema';
import { FREEZE_REJECT } from './service';

function refreshMember(id: string) {
  revalidatePath('/members');
  revalidatePath(`/members/${id}`);
  revalidatePath('/payments');
  revalidatePath('/');
}

export async function createMemberAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  // 1. Authenticate
  const session = await requireSession();
  // 2. Validate
  const parsed = MemberCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { packageId, method, name, phone, email, note } = parsed.data;
  // 3–4. Authorize + Execute (DAL ตรวจสิทธิ์ members.manage และ payments.collect)
  let created: Awaited<ReturnType<typeof createMember>>;
  try {
    created = await createMember(session, { name, phone, email, note, packageId, method });
  } catch (error) {
    return knownFailure(error);
  }
  // 5. Audit
  await audit(session, 'member.create', 'member', created.memberId);
  refreshMember(created.memberId);
  redirect(created.paid ? `/members/${created.memberId}?created=1` : `/payments/${created.paymentId}?created=1`);
}

export async function updateMemberAction(memberId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = MemberFieldsSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateMember(session, memberId, parsed.data);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'member.update', 'member', memberId);
  refreshMember(memberId);
  return { ok: true, message: 'บันทึกข้อมูลสมาชิกแล้ว' };
}

export async function renewMemberAction(memberId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = RenewSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await renewMember(session, memberId, parsed.data.packageId, parsed.data.method);
    await audit(session, 'member.renew', 'payment', result.paymentId);
    refreshMember(memberId);
    if (!result.paid) return { ok: true, message: 'สร้างรายการรอชำระแล้ว ให้สมาชิกสแกน QR แล้วกดยืนยันเมื่อเงินเข้า', href: `/payments/${result.paymentId}` };
    const member = await getMemberDetail(session, memberId);
    return { ok: true, message: member ? `ชำระเงินแล้ว ใช้ได้ถึง ${formatThaiDate(member.expiresOn, 'long')}` : 'ชำระเงินแล้ว', href: `/payments/${result.paymentId}` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function freezeMemberAction(memberId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = FreezeSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const decision = await freezeMember(session, memberId, parsed.data.days);
    if (!decision.ok) return { ok: false, message: FREEZE_REJECT[decision.reason] };
    await audit(session, 'member.freeze', 'member', memberId);
    refreshMember(memberId);
    return { ok: true, message: `พักสมาชิกถึง ${formatThaiDate(decision.freeze.until, 'long')} วันหมดอายุเลื่อนเป็น ${formatThaiDate(decision.expiresOn, 'long')}` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function unfreezeMemberAction(memberId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await unfreezeMember(session, memberId);
  } catch (error) {
    return knownFailure(error);
  }
  await audit(session, 'member.unfreeze', 'member', memberId);
  refreshMember(memberId);
  return { ok: true, message: 'ยกเลิกการพักแล้ว สมาชิกเข้ายิมได้ตั้งแต่วันนี้' };
}

/** ส่งเตือนต่ออายุผ่าน LINE OA — ระยะที่ 1 จำลองการส่ง (ระยะที่ 2 ส่งผ่าน background job §A.1) */
export async function remindMemberAction(memberId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const member = await getMemberDetail(session, memberId);
    if (!member) return { ok: false, message: 'ไม่พบสมาชิกนี้แล้ว' };
    await audit(session, 'member.remind', 'member', memberId);
    return { ok: true, message: `ส่งเตือนถึง ${member.name} แล้ว (จำลอง)` };
  } catch (error) {
    return knownFailure(error);
  }
}
