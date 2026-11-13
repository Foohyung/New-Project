'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { createCoupon, previewCoupon, previewPurchaseCoupon, setCouponActive, updateCoupon } from '@/api/dal/coupons/coupons/coupons.dal';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { CouponCreateSchema, CouponUpdateSchema, PurchaseCouponPreviewSchema } from '@/api/schemas/coupons/coupons/coupons.schema';

/** ดูผลคูปองก่อนชำระ (ไม่บันทึกอะไร) */
export async function previewCouponAction(input: { code: string; packageId: string; memberId: string | null }) {
  const session = await requireSession();
  if (!input.code.trim()) return { ok: false as const, message: 'ใส่โค้ดก่อน' };
  return previewCoupon(session, input);
}

export async function previewPurchaseCouponAction(input: unknown) {
  const session = await requireSession();
  const parsed = PurchaseCouponPreviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: 'ข้อมูลรายการซื้อไม่ถูกต้อง รีเฟรชหน้าแล้วลองใหม่' };
  return previewPurchaseCoupon(session, parsed.data);
}

export async function createCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CouponCreateSchema.safeParse({
    ...formObject(formData),
    appliesTo: formData.getAll('appliesTo').filter((v): v is string => typeof v === 'string'),
    packageIds: formData.getAll('packageIds').filter((v): v is string => typeof v === 'string'),
    renewOnly: formData.get('renewOnly') === 'on',
    newOnly: formData.get('newOnly') === 'on',
  });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const c = await createCoupon(session, parsed.data);
    await audit(session, 'coupon.create', 'coupon', c.code, { after: parsed.data });
    revalidatePath('/coupons');
    return { ok: true, message: `สร้างคูปอง ${c.code} (${c.label}) แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateCouponAction(code: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CouponUpdateSchema.safeParse({
    ...formObject(formData),
    appliesTo: formData.getAll('appliesTo').filter((v): v is string => typeof v === 'string'),
    packageIds: formData.getAll('packageIds').filter((v): v is string => typeof v === 'string'),
    renewOnly: formData.get('renewOnly') === 'on',
    newOnly: formData.get('newOnly') === 'on',
  });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const updated = await updateCoupon(session, code, parsed.data);
    await audit(session, 'coupon.update', 'coupon', code, { after: parsed.data });
    revalidatePath('/coupons');
    return { ok: true, message: `บันทึกคูปอง ${updated.code} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function setCouponActiveAction(code: string, active: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await setCouponActive(session, code, active);
    await audit(session, active ? 'coupon.enable' : 'coupon.disable', 'coupon', code);
    revalidatePath('/coupons');
    return { ok: true, message: active ? 'เปิดใช้แล้ว' : 'ปิดใช้แล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
