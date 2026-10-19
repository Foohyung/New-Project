'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { updatePackage } from '@/server/dal/packages';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { PackageUpdateSchema } from './schema';

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
