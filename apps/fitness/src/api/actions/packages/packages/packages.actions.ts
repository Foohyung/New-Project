'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { createPackage, deletePackage, updatePackage } from '@/api/dal/packages/packages/packages.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { PackageCreateSchema, PackageUpdateSchema } from '@/api/schemas/packages/packages/packages.schema';

/** หน้าที่แสดงแพ็กเกจ/ราคา — เปลี่ยนแล้วต้องโหลดใหม่ */
function revalidatePackagePages(): void {
  revalidatePath('/packages');
  revalidatePath('/members');
  revalidatePath('/coupons');
  revalidatePath('/me');
}

export async function createPackageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = PackageCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const p = await createPackage(session, parsed.data);
    await audit(session, 'package.create', 'package', p.id, { after: p });
    revalidatePackagePages();
    return { ok: true, message: `เพิ่มแพ็กเกจ ${p.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updatePackageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = PackageUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    const { before, after } = await updatePackage(session, id, input);
    await audit(session, 'package.update', 'package', id, { before, after });
    revalidatePackagePages();
    return { ok: true, message: `บันทึก ${after.name} แล้ว ราคาและระยะใหม่ใช้กับรายการถัดไป` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ลบแพ็กเกจ (ปุ่ม 🗑 ท้ายแถว) */
export async function deletePackageAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let name: string;
  try {
    const before = await deletePackage(session, id);
    name = before.name;
    await audit(session, 'package.delete', 'package', id, { before });
  } catch (error) {
    return knownFailure(error);
  }
  revalidatePackagePages();
  return { ok: true, message: `ลบแพ็กเกจ ${name} แล้ว` };
}
