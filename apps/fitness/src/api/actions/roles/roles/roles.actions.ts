'use server';

import { revalidatePath } from 'next/cache';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { permissionsAllowedForRole } from '@/api/services/auth/auth/auth.roles';
import { createRoleDefinition, deleteRoleDefinition, updateRoleDefinition } from '@/api/dal/roles/roles/roles.dal';
import { CreateRoleSchema, DeleteRoleSchema, UpdateRoleSchema } from '@/api/schemas/roles/roles/roles.schema';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

function roleFormObject(formData: FormData): Record<string, unknown> {
  const fields = formObject(formData);
  return {
    ...fields,
    permissions: formData.getAll('permissions').filter((value): value is string => typeof value === 'string'),
  };
}

export async function createRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CreateRoleSchema.safeParse(roleFormObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  if (!permissionsAllowedForRole(parsed.data.id, parsed.data.permissions)) return { ok: false, message: 'สิทธิ์จัดการ role สงวนไว้สำหรับ admin เท่านั้น' };
  try {
    await createRoleDefinition(session, parsed.data);
    await audit(session, 'role.create', 'role', parsed.data.id, { after: { name: parsed.data.name, permissions: parsed.data.permissions } });
    revalidatePath('/roles');
    revalidatePath('/users');
    return { ok: true, message: `สร้าง role ${parsed.data.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = UpdateRoleSchema.safeParse(roleFormObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  if (!permissionsAllowedForRole(parsed.data.id, parsed.data.permissions)) return { ok: false, message: 'สิทธิ์จัดการ role สงวนไว้สำหรับ admin เท่านั้น' };
  try {
    await updateRoleDefinition(session, parsed.data);
    await audit(session, 'role.update', 'role', parsed.data.id, { after: { name: parsed.data.name, permissions: parsed.data.permissions } });
    revalidatePath('/roles');
    revalidatePath('/users');
    return { ok: true, message: `บันทึก role ${parsed.data.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function deleteRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = DeleteRoleSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await deleteRoleDefinition(session, parsed.data.id);
    await audit(session, 'role.delete', 'role', parsed.data.id);
    revalidatePath('/roles');
    revalidatePath('/users');
    return { ok: true, message: 'ลบ role แล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
