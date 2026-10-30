'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { updatePackage } from '@/api/dal/packages/packages/packages.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { PackageUpdateSchema } from '@/api/schemas/packages/packages/packages.schema';

export async function updatePackageAction(packageId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = PackageUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const p = await updatePackage(session, packageId, { priceSatang: parsed.data.price, description: parsed.data.description, active: parsed.data.active });
    await audit(session, 'package.update', 'package', packageId);
    revalidatePath('/packages');
    revalidatePath('/me');
    return { ok: true, message: `บันทึก ${p.name} แล้ว ราคาใหม่ใช้กับรายการถัดไป` };
  } catch (error) {
    return knownFailure(error);
  }
}
