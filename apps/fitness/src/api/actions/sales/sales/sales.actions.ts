'use server';

import { revalidatePath } from 'next/cache';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { formatBaht } from '@/api/lib/utils/utils/utils';
import { changeStock, createProduct, createSale, deleteProduct, updateProduct, voidSale } from '@/api/dal/sales/sales/sales.dal';
import { ProductCreateSchema, ProductUpdateSchema, SaleSchema, StockChangeSchema } from '@/api/schemas/sales/sales/sales.schema';
import { readImageUpload } from '@/api/services/shared/shared/shared.image';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_SLIP_BYTES = 10 * 1024 * 1024;

/** รูปจากฟอร์ม: ไฟล์ใหม่ / ติ๊ก "ลบรูป" = null / ไม่มีอะไร = undefined (คงรูปเดิม) */
async function imageFromForm(formData: FormData): Promise<{ image: { data: string; contentType: string } | null | undefined } | { error: ActionResult }> {
  const upload = await readImageUpload(formData.get('imageFile'), MAX_IMAGE_BYTES);
  if (upload && 'error' in upload) return { error: { ok: false, message: upload.error, fieldErrors: { imageFile: upload.error } } };
  return { image: upload ?? (formData.get('clearImage') === 'on' ? null : undefined) };
}

function refreshShop(): void {
  revalidatePath('/sales');
  revalidatePath('/products');
}

export async function createProductAction(branch: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ProductCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const upload = await imageFromForm(formData);
  if ('error' in upload) return upload.error;
  try {
    const p = await createProduct(session, branch, parsed.data, upload.image);
    await audit(session, 'product.create', 'products', p.id, { after: { ...parsed.data, image: upload.image ? 'uploaded' : null } });
    refreshShop();
    return { ok: true, message: `เพิ่มสินค้า ${p.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

export async function updateProductAction(branch: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ProductUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const upload = await imageFromForm(formData);
  if ('error' in upload) return upload.error;
  try {
    const { before, after } = await updateProduct(session, branch, parsed.data, upload.image);
    // รูปเก็บแค่ว่าเปลี่ยน ไม่เก็บไฟล์ใน log
    const image = upload.image === undefined ? undefined : upload.image ? 'uploaded' : 'removed';
    await audit(session, 'product.update', 'products', after.id, { before: { ...before, imageUrl: undefined }, after: { ...after, imageUrl: undefined, ...(image ? { image } : {}) } });
    refreshShop();
    return { ok: true, message: `บันทึกสินค้า ${after.name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ลบสินค้า (ปุ่ม 🗑 ท้ายแถว) */
export async function deleteProductAction(branch: string, id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const { name } = await deleteProduct(session, branch, id);
    await audit(session, 'product.delete', 'products', id, { before: { name } });
    refreshShop();
    return { ok: true, message: `ลบสินค้า ${name} แล้ว` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** รับของเข้า / ปรับยอดสต็อก */
export async function changeStockAction(branch: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = StockChangeSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const r = await changeStock(session, branch, parsed.data);
    await audit(session, `stock.${parsed.data.mode}`, 'products', parsed.data.productId, { after: { change: r.change, balance: r.balance, note: parsed.data.note } });
    refreshShop();
    const sign = r.change > 0 ? '+' : '';
    return { ok: true, message: `${r.name} ${r.change === 0 ? 'จำนวนตรงกับระบบอยู่แล้ว' : `${sign}${String(r.change)} ชิ้น`} · คงเหลือ ${String(r.balance)}` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ขายหน้าร้าน (POS) */
export async function createSaleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = SaleSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, parsed.error.issues[0]?.message ?? 'ตรวจตะกร้าอีกครั้ง');
  const uploaded = await readImageUpload(formData.get('slipFile'), MAX_SLIP_BYTES);
  if (uploaded && 'error' in uploaded) return { ok: false, message: uploaded.error, fieldErrors: { slipFile: uploaded.error } };
  const slip = uploaded ?? undefined;
  if (session.role === 'member' && parsed.data.method === 'promptpay' && !slip) {
    return { ok: false, message: 'กรุณาแนบรูปสลิปก่อนยืนยันการซื้อ', fieldErrors: { slipFile: 'กรุณาเลือกรูปสลิป' } };
  }
  try {
    const sale = await createSale(session, { ...parsed.data, slip });
    await audit(session, 'sale.create', 'sales', sale.id, { after: { receiptNo: sale.receiptNo, listPriceSatang: sale.listPriceSatang, discountSatang: sale.discountSatang, couponCode: sale.couponCode, totalSatang: sale.totalSatang, method: sale.method, slipUploaded: Boolean(slip), items: sale.items } });
    refreshShop();
    revalidatePath('/reports');
    return { ok: true, message: `${session.role === 'member' ? 'ซื้อสำเร็จ' : 'ขายแล้ว'} ${sale.receiptNo} · ${formatBaht(sale.totalSatang)}` };
  } catch (error) {
    return knownFailure(error);
  }
}

/** ยกเลิกบิล (คืนสต็อก) */
export async function voidSaleAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const sale = await voidSale(session, id);
    await audit(session, 'sale.void', 'sales', id, { before: { receiptNo: sale.receiptNo, totalSatang: sale.totalSatang, items: sale.items } });
    refreshShop();
    revalidatePath('/reports');
    return { ok: true, message: `ยกเลิกบิล ${sale.receiptNo} แล้ว คืนสต็อกเรียบร้อย` };
  } catch (error) {
    return knownFailure(error);
  }
}
