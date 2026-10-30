'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { addOwnerBranch, createManagedUser, deleteManagedUser, removeOwnerBranch, resolvePasswordReset, updateManagedUser } from '@/api/dal/users/users/users.dal';
import { DEFAULT_MEMBER_PASSWORD } from '@/api/services/members/members/members.service';
import { CreateUserSchema, OwnerBranchSchema, UpdateUserSchema } from '@/api/schemas/users/users/users.schema';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

export async function createManagedUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CreateUserSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { confirmPassword: _confirmPassword, ...input } = parsed.data;
  try {
    const user = await createManagedUser(session, input);
    await audit(session, 'user.create', 'user', user.id, {
      after: { login: user.login, name: user.name, nickname: user.nickname, role: user.role, branch: user.branch, activeFrom: user.activeFrom, activeTo: user.activeTo },
    });
    revalidatePath('/users');
    return { ok: true, message: `เพิ่มบัญชี ${user.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** (admin) เพิ่มสาขาให้เจ้าของ — ownerId ผูกมาจากหน้าเว็บด้วย .bind */
export async function addOwnerBranchAction(ownerId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = OwnerBranchSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await addOwnerBranch(session, ownerId, parsed.data.branch);
    await audit(session, 'owner.branch.add', 'user', ownerId, { after: { branch: parsed.data.branch } });
    revalidatePath('/users', 'layout');
    return { ok: true, message: `เพิ่ม${parsed.data.branch}ให้เจ้าของแล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** (admin) เอาสาขาเพิ่มเติมออกจากเจ้าของ */
export async function removeOwnerBranchAction(ownerId: string, branch: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await removeOwnerBranch(session, ownerId, branch);
    await audit(session, 'owner.branch.remove', 'user', ownerId, { before: { branch } });
    revalidatePath('/users', 'layout');
    return { ok: true, message: `เอา${branch}ออกแล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ฟิลด์ที่บันทึกใน audit log (ไม่มีรหัสผ่าน) */
function auditView(u: { login: string; name: string; nickname: string; role: string; branch: string; active: boolean; activeFrom: string | null; activeTo: string | null }) {
  return { login: u.login, name: u.name, nickname: u.nickname, role: u.role, branch: u.branch, active: u.active, activeFrom: u.activeFrom, activeTo: u.activeTo };
}

/** (admin) แก้ไขบัญชี — id ผูกมาจากหน้าเว็บด้วย .bind */
export async function updateManagedUserAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = UpdateUserSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { confirmPassword: _confirmPassword, ...input } = parsed.data;
  try {
    const { before, after } = await updateManagedUser(session, id, input);
    await audit(session, 'user.update', 'user', id, { before: auditView(before), after: { ...auditView(after), ...(input.password ? { password: 'changed' } : {}) } });
    revalidatePath('/users', 'layout');
    return { ok: true, message: `บันทึกบัญชี ${after.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** (admin) ลบบัญชีถาวร · back = ลบจากหน้าแก้ไข: กลับหน้านั้นพร้อม ?deleted= (หน้าแก้ไขของบัญชีที่ลบแล้วจะเป็น 404) */
export async function deleteManagedUserAction(id: string, back: string | null, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let name: string;
  try {
    const user = await deleteManagedUser(session, id);
    name = user.name;
    await audit(session, 'user.delete', 'user', id, { before: auditView(user) });
  } catch (error) {
    return knownFailure(error);
  }
  revalidatePath('/users', 'layout');
  if (back) {
    // กลับไปหน้าที่กดมา ยกเว้นหน้าของบัญชีที่เพิ่งลบ (เช่น หน้าเจ้าของคนนั้น) → หน้ารายการบัญชี
    const target = back.startsWith('/users') && !back.startsWith(`/users/${encodeURIComponent(id)}`) ? back : '/users';
    redirect(`${target}?deleted=${encodeURIComponent(name)}`);
  }
  return { ok: true, message: `ลบบัญชี ${name} แล้ว` };
}

/** รีเซ็ตรหัสผ่านตามคำขอ "ลืมรหัสผ่าน" เป็นรหัสชั่วคราว (เท่ากับรหัสเริ่มต้นของสมาชิก) หรือปิดคำขอ */
export async function resolvePasswordResetAction(requestId: string, resolution: 'reset' | 'dismissed', _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const { userId, name } = await resolvePasswordReset(session, requestId, resolution, DEFAULT_MEMBER_PASSWORD);
    await audit(session, resolution === 'reset' ? 'user.password.reset' : 'user.password.reset-dismiss', 'user', userId);
    revalidatePath('/users', 'layout');
    return resolution === 'reset'
      ? { ok: true, message: `รีเซ็ตรหัสผ่านของ ${name} เป็น ${DEFAULT_MEMBER_PASSWORD} แล้ว — แจ้งผู้ใช้ เข้าสู่ระบบแล้วจะถูกบังคับตั้งรหัสใหม่` }
      : { ok: true, message: `ปิดคำขอของ ${name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}
