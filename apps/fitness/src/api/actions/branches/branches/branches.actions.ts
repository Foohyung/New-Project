'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { createBranch, deleteBranch, updateBranch } from '@/api/dal/branches/branches/branches.dal';
import { CreateBranchSchema, UpdateBranchSchema } from '@/api/schemas/branches/branches/branches.schema';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { deletedRedirectPath } from '@/api/lib/flash/flash/flash';

/** หน้าที่แสดงชื่อสาขา — เปลี่ยนแล้วต้องโหลดใหม่ */
function revalidateBranchPages(): void {
  revalidatePath('/branches');
  revalidatePath('/users');
  revalidatePath('/branding');
}

export async function createBranchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CreateBranchSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await createBranch(session, parsed.data);
    await audit(session, 'branch.create', 'branches', parsed.data.name, { after: parsed.data });
    revalidateBranchPages();
    return { ok: true, message: `เพิ่มสาขา ${parsed.data.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateBranchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = UpdateBranchSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    const { before } = await updateBranch(session, id, input);
    await audit(session, 'branch.update', 'branches', id, { before, after: input });
    revalidateBranchPages();
    return { ok: true, message: before.name === input.name ? `บันทึกสาขา ${input.name} แล้ว` : `เปลี่ยนชื่อสาขา ${before.name} เป็น ${input.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ลบสาขา · fromDetail = กดจากหน้าแก้ไข (หน้านั้นหายไปแล้ว จึง redirect กลับหน้ารายการพร้อม ?deleted=) */
export async function deleteBranchAction(id: string, fromDetail: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let name: string;
  try {
    ({ name } = await deleteBranch(session, id));
    await audit(session, 'branch.delete', 'branches', id, { before: { name } });
  } catch (error) {
    return knownFailure(error);
  }
  revalidateBranchPages();
  if (fromDetail) redirect(await deletedRedirectPath('/branches', `สาขา ${name}`));
  return { ok: true, message: `ลบสาขา ${name} แล้ว` };
}
