'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { cancelEnrollment, confirmEnrollment, createCourse, deleteCourse, enrollSelf, submitEnrollmentSlip, updateCourse } from '@/api/dal/courses/courses/courses.dal';
import { CourseCreateSchema, CourseUpdateSchema } from '@/api/schemas/courses/courses/courses.schema';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { readImageUpload } from '@/api/services/shared/shared/shared.image';

const MAX_SLIP_BYTES = 10 * 1024 * 1024;

function refreshCourses(courseId?: string): void {
  revalidatePath('/courses');
  if (courseId) revalidatePath(`/courses/${courseId}`);
  revalidatePath('/me/courses');
}

export async function createCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CourseCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const c = await createCourse(session, parsed.data);
    await audit(session, 'course.create', 'courses', c.id, { after: parsed.data });
    refreshCourses();
    return { ok: true, message: `เพิ่มคอร์ส ${c.title} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CourseUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    const { before, after } = await updateCourse(session, id, input);
    await audit(session, 'course.update', 'courses', id, { before, after });
    refreshCourses(id);
    return { ok: true, message: `บันทึกคอร์ส ${after.title} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ลบคอร์ส (ปุ่ม 🗑 ท้ายแถว) */
export async function deleteCourseAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const { title } = await deleteCourse(session, id);
    await audit(session, 'course.delete', 'courses', id, { before: { title } });
    refreshCourses();
    return { ok: true, message: `ลบคอร์ส ${title} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** เจ้าหน้าที่ยืนยันว่าเงินเข้าแล้ว */
export async function confirmEnrollmentAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const e = await confirmEnrollment(session, id);
    await audit(session, 'course.enrollment.confirm', 'course_enrollments', id);
    refreshCourses(e.courseId);
    return { ok: true, message: `ยืนยันการชำระ ${e.receiptNo} ของ ${e.memberName} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ยกเลิกการสมัคร (สมาชิกก่อนชำระ / ผู้จัดการคอร์สได้ทุกสถานะ) */
export async function cancelEnrollmentAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const e = await cancelEnrollment(session, id);
    await audit(session, 'course.enrollment.cancel', 'course_enrollments', id);
    refreshCourses(e.courseId);
    return { ok: true, message: `ยกเลิกการสมัคร ${e.courseTitle} ของ ${e.memberName} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** สมาชิกแจ้งว่าโอนแล้ว */
export async function submitEnrollmentSlipAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const uploaded = await readImageUpload(formData.get('slipFile'), MAX_SLIP_BYTES);
  if (uploaded && 'error' in uploaded) return { ok: false, message: uploaded.error, fieldErrors: { slipFile: uploaded.error } };
  const slip = uploaded ?? undefined;
  if (session.role === 'member' && !slip) return { ok: false, message: 'กรุณาแนบรูปสลิปก่อนแจ้งชำระ', fieldErrors: { slipFile: 'กรุณาเลือกรูปสลิป' } };
  try {
    const e = await submitEnrollmentSlip(session, id, slip);
    await audit(session, 'course.enrollment.slip', 'course_enrollments', id, { after: { slipUploaded: Boolean(slip) } });
    refreshCourses(e.courseId);
    revalidatePath(`/me/courses/${id}`);
    return { ok: true, message: 'ได้รับแจ้งการโอนแล้ว เจ้าหน้าที่จะตรวจยอดและยืนยันที่นั่งให้' };
  } catch (error) {
    return knownFailure(error);
  }
}

/** สมาชิกสมัครคอร์สเอง → ไปหน้าชำระ PromptPay */
export async function enrollSelfAction(courseId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const rawCouponCode = _formData.get('couponCode');
  if (rawCouponCode !== null && (typeof rawCouponCode !== 'string' || rawCouponCode.trim().length > 40)) {
    return { ok: false, message: 'โค้ดคูปองไม่ถูกต้อง', fieldErrors: { couponCode: 'โค้ดไม่ถูกต้อง' } };
  }
  const couponCode = typeof rawCouponCode === 'string' && rawCouponCode.trim() ? rawCouponCode.trim() : null;
  let id: string;
  try {
    const e = await enrollSelf(session, courseId, couponCode);
    id = e.id;
    await audit(session, 'course.enrollment.create', 'course_enrollments', id, { after: { courseId, amountSatang: e.amountSatang, discountSatang: e.discountSatang, couponCode: e.couponCode } });
  } catch (error) {
    return knownFailure(error);
  }
  refreshCourses(courseId);
  redirect(`/me/courses/${id}`);
}
