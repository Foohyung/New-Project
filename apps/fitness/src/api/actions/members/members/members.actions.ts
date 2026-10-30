'use server';

import { formatThaiDate } from '@/api/lib/utils/utils/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { sendManualReminder } from '@/api/dal/reminders/reminders/reminders.dal';
import { createMember, deleteMember, freezeMember, getMemberDetail, renewMember, unfreezeMember, updateMember } from '@/api/dal/members/members/members.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { FreezeSchema, MemberCreateSchema, MemberFieldsSchema, RenewSchema } from '@/api/schemas/members/members/members.schema';
import { DEFAULT_MEMBER_PASSWORD, FREEZE_REJECT } from '@/api/services/members/members/members.service';

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
  const { packageId, method, name, phone, email, note, couponCode, marketingConsent } = parsed.data;
  // 3–4. Authorize + Execute (DAL ตรวจสิทธิ์ members.manage และ payments.collect)
  let created: Awaited<ReturnType<typeof createMember>>;
  try {
    created = await createMember(session, { name, phone, email, note, packageId, method, couponCode, marketingConsent, password: DEFAULT_MEMBER_PASSWORD });
  } catch (error) {
    return knownFailure(error);
  }
  // 5. Audit
  await audit(session, 'member.create', 'member', created.memberId, { after: { name, phone, packageId, method, loginAccount: true } });
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

/**
 * ลบสมาชิกถาวร · จากตาราง = คืนผลให้แสดง popup ในหน้าเดิม
 * จากหน้าโปรไฟล์ (backToList) = กลับหน้าสมาชิกทันที พร้อม ?deleted= ให้แสดง popup — ไม่ refresh หน้าโปรไฟล์ที่หายไปแล้ว (จะเป็น 404)
 */
export async function deleteMemberAction(memberId: string, backToList: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let name: string;
  try {
    const removed = await deleteMember(session, memberId);
    name = removed.name;
    await audit(session, 'member.delete', 'member', memberId, { before: removed });
  } catch (error) {
    return knownFailure(error);
  }
  revalidatePath('/members');
  revalidatePath('/payments');
  revalidatePath('/');
  if (backToList) redirect(`/members?deleted=${encodeURIComponent(name)}`);
  return { ok: true, message: `ลบสมาชิก ${name} แล้ว` };
}

export async function renewMemberAction(memberId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = RenewSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await renewMember(session, memberId, parsed.data.packageId, parsed.data.method, parsed.data.couponCode);
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
    const { name } = await sendManualReminder(session, memberId);
    await audit(session, 'member.remind', 'member', memberId);
    return { ok: true, message: `ส่งเตือนถึง ${name} แล้ว (จำลอง)` };
  } catch (error) {
    return knownFailure(error);
  }
}
