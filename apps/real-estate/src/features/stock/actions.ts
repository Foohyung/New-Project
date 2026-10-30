'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/agent/auth';
import { addUnit, createClient, createOwner, createProperty, updateOwner, updateUnitStatus } from '@/server/dal/agent-stock';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { ClientSchema, OwnerSchema, PropertySchema, StatusSchema, UnitSchema } from './schema';

/* ทุก action: authenticate → validate → authorize (ใน DAL) → execute → audit (ใน DAL) (§6.1) */

export async function createPropertyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const data = formObject(formData);
  const property = PropertySchema.safeParse(data);
  const unit = UnitSchema.safeParse(data);
  if (!property.success || !unit.success) {
    const errors = [...(property.error?.issues ?? []), ...(unit.error?.issues ?? [])];
    const fieldErrors: Record<string, string> = {};
    for (const issue of errors) fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
    return { ok: false, message: 'กรุณาตรวจข้อมูลที่ไฮไลต์', fieldErrors };
  }
  let code: string;
  try {
    code = (await createProperty(session, { ...property.data, ...unit.data })).code;
  } catch (error) {
    return knownFailure(error);
  }
  revalidatePath('/agent', 'layout');
  redirect(`/agent/stock/${code}`);
}

export async function addUnitAction(propertyId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = UnitSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const unit = await addUnit(session, propertyId, parsed.data);
    revalidatePath('/agent', 'layout');
    return { ok: true, message: `เพิ่มยูนิต ${unit.label} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = StatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { unitId, status, leaseEnd } = parsed.data;
  if (status === 'rented' && !leaseEnd) return { ok: false, message: 'เลือกวันสิ้นสุดสัญญาเช่า', fieldErrors: { leaseEnd: 'เลือกวันสิ้นสุดสัญญาเช่า' } };
  try {
    await updateUnitStatus(session, unitId, status, leaseEnd || null);
    revalidatePath('/agent', 'layout');
    return { ok: true, message: 'บันทึกสถานะแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function createOwnerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = OwnerSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  let id: string;
  try {
    id = (await createOwner(session, parsed.data)).id;
  } catch (error) {
    return knownFailure(error);
  }
  revalidatePath('/agent', 'layout');
  redirect(`/agent/owners/${id}`);
}

export async function updateOwnerAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = OwnerSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateOwner(session, id, parsed.data);
    revalidatePath('/agent', 'layout');
    return { ok: true, message: 'บันทึกข้อมูลเจ้าของแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function createClientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ClientSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const client = await createClient(session, parsed.data);
    revalidatePath('/agent', 'layout');
    return { ok: true, message: `เพิ่มลูกค้า ${client.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}
