'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { createCoupon, previewCoupon, setCouponActive } from '@/server/dal/coupons';
import { formObject, knownFailure, validationFailure, type ActionResult } from '../shared/action-result';
import { CouponCreateSchema } from './schema';

/** ดูผลคูปองก่อนชำระ (ไม่บันทึกอะไร) */
export async function previewCouponAction(input: { code: string; packageId: string; memberId: string | null }) {
  const session = await requireSession();
  if (!input.code.trim()) return { ok: false as const, message: 'ใส่โค้ดก่อน' };
  return previewCoupon(session, input);
}

export async function createCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CouponCreateSchema.safeParse({
    ...formObject(formData),
    packageIds: formData.getAll('packageIds').filter((v): v is string => typeof v === 'string'),
    renewOnly: formData.get('renewOnly') === 'on',
    newOnly: formData.get('newOnly') === 'on',
  });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const c = await createCoupon(session, parsed.data);
    await audit(session, 'coupon.create', 'coupon', c.code);
    revalidatePath('/marketing/coupons');
    return { ok: true, message: `สร้างคูปอง ${c.code} (${c.label}) แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function setCouponActiveAction(code: string, active: boolean, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await setCouponActive(session, code, active);
    await audit(session, active ? 'coupon.enable' : 'coupon.disable', 'coupon', code);
    revalidatePath('/marketing/coupons');
    return { ok: true, message: active ? 'เปิดใช้แล้ว' : 'ปิดใช้แล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
