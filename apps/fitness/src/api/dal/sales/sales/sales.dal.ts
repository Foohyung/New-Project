import 'server-only';
import { nextReceiptNo } from '@/api/dal/payments/payments/payments.receipt-no';
import { Prisma, type StockReason } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { bangkokDate } from '@/api/lib/utils/utils/utils';
import { bangkokSpan, prisma, prismaAs, transaction, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';
import type { ProductInput } from '@/api/schemas/sales/sales/sales.schema';
import type { ProductBranchSummaryDto, ProductDto, SaleDto } from '@/api/types/sales/sales/sales.types';
import { assertPaymentMethodEnabled } from '@/api/dal/payments/payments/payments.dal';
import { resolvePurchaseCoupon } from '@/api/dal/coupons/coupons/coupons.dal';
import { activeBranchNames } from '@/api/dal/branches/branches/branches.dal';
import type { DateRange } from '@/api/services/shared/shared/shared.date-range';

/** ไม่ดึง base64 ของรูปมาด้วย (หนัก) — รูปโหลดแยกที่ /api/products/<id>/image */
const PRODUCT_QUERY = { include: { _count: { select: { saleItems: true } } }, omit: { imageData: true } } as const;
type ProductRow = Prisma.ProductGetPayload<typeof PRODUCT_QUERY>;
const toProduct = (p: ProductRow): ProductDto => ({
  id: p.id, name: p.name, category: p.category, priceSatang: p.priceSatang, stock: p.stock, lowStock: p.lowStock, active: p.active,
  imageUrl: p.imageContentType ? `/api/products/${encodeURIComponent(p.id)}/image?v=${String(p.updatedAt.getTime())}` : null,
  sold: p._count.saleItems > 0, updatedAt: p.updatedAt.toISOString(), updatedByName: p.updatedByName,
});

/** รูปที่อัปโหลด · null = ลบรูป · undefined = คงรูปเดิม */
export type ProductImageInput = { data: string; contentType: string } | null | undefined;
const imageColumns = (image: ProductImageInput) => (image === undefined ? {} : { imageData: image?.data ?? null, imageContentType: image?.contentType ?? null });

const SALE_QUERY = { include: { items: true }, omit: { slipData: true } } as const;
type SaleRow = Prisma.SaleGetPayload<typeof SALE_QUERY>;
const toSale = (s: SaleRow): SaleDto => ({
  id: s.id, receiptNo: s.receiptNo, method: s.method, totalSatang: s.totalSatang, listPriceSatang: s.listPriceSatang, discountSatang: s.discountSatang, couponCode: s.couponCode, createdAt: s.createdAt.toISOString(), soldBy: s.createdByName,
  hasSlip: Boolean(s.slipContentType),
  voidedAt: s.voidedAt?.toISOString() ?? null, voidedByName: s.voidedByName, items: s.items.map(i => ({ name: i.name, priceSatang: i.priceSatang, qty: i.qty })),
});

async function canAccessSale(session: Session, createdById: string | null): Promise<boolean> {
  if (session.role === 'admin') return true;
  if (session.role === 'member') return createdById === session.userId;
  if (!createdById) return false;
  const creator = await prisma().user.findUnique({ where: { id: createdById }, select: { branch: true } });
  return creator?.branch === session.branch;
}

function taken(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('PRODUCT_TAKEN');
  throw error;
}

/** ล็อกแถวสินค้า (กันขาย/รับของพร้อมกันแล้วสต็อกเพี้ยน) */
async function lockProducts(tx: Tx, ids: string[]): Promise<void> {
  if (ids.length) await tx.$queryRaw`SELECT id FROM products WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
}

/** เปลี่ยนสต็อก + บันทึกประวัติ (เรียกใน transaction ที่ล็อกแถวแล้ว) */
async function moveStock(tx: Tx, session: Session, productId: string, change: number, reason: StockReason, extra: { note?: string | null; saleId?: string } = {}): Promise<number> {
  const row = await tx.product.update({ where: { id: productId }, data: { stock: { increment: change } }, select: { stock: true } });
  if (row.stock < 0) throw new Error('NEGATIVE_STOCK');
  await tx.stockMovement.create({ data: { productId, change, reason, balance: row.stock, note: extra.note ?? null, saleId: extra.saleId ?? null, createdById: session.userId, createdByName: session.name } });
  return row.stock;
}

/* ---------- สินค้าและสต็อก ---------- */

/** หน้าขายเห็นเฉพาะที่เปิดขาย · หน้าจัดการสินค้าเห็นทั้งหมด */
export async function listProducts(session: Session, options: { activeOnly?: boolean; branch?: string } = {}): Promise<ProductDto[]> {
  if (!can(session, 'sales.use') && !can(session, 'products.manage')) throw new ForbiddenError();
  const branch = session.role === 'admin' ? options.branch ?? session.branch : session.branch;
  if (!await prisma().branch.findUnique({ where: { name: branch }, select: { name: true } })) throw new Error('UNKNOWN_BRANCH');
  const rows = await prismaAs(session).product.findMany({
    where: { branch, ...(options.activeOnly ? { active: true } : {}) },
    ...PRODUCT_QUERY,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toProduct);
}

export async function listProductBranches(session: Session): Promise<ProductBranchSummaryDto[]> {
  await authorize(session, 'products.manage');
  if (session.role !== 'admin') throw new ForbiddenError();
  const db = prisma();
  const [branches, productCounts, activeCounts] = await Promise.all([
    db.branch.findMany({ select: { name: true, active: true }, orderBy: [{ createdAt: 'asc' }, { name: 'asc' }] }),
    db.product.groupBy({ by: ['branch'], _count: { _all: true } }),
    db.product.groupBy({ by: ['branch'], where: { active: true }, _count: { _all: true } }),
  ]);
  const countByBranch = new Map(productCounts.map(row => [row.branch, row._count._all]));
  const activeByBranch = new Map(activeCounts.map(row => [row.branch, row._count._all]));
  return branches.map(branch => ({
    branch: branch.name,
    active: branch.active,
    productCount: countByBranch.get(branch.name) ?? 0,
    activeCount: activeByBranch.get(branch.name) ?? 0,
  }));
}

async function authorizeProductBranch(session: Session, branch: string): Promise<void> {
  if (session.role !== 'admin' && session.branch !== branch) throw new ForbiddenError();
  if (!await prisma().branch.findUnique({ where: { name: branch }, select: { name: true } })) throw new Error('UNKNOWN_BRANCH');
}

export async function createProduct(session: Session, branch: string, input: Omit<ProductInput, 'id'> & { stock: number }, image: ProductImageInput): Promise<ProductDto> {
  await authorize(session, 'products.manage');
  await authorizeProductBranch(session, branch);
  try {
    return await transaction(session, async tx => {
      const row = await tx.product.create({ data: { branch, name: input.name, category: input.category, priceSatang: input.price, lowStock: input.lowStock, active: input.active, ...imageColumns(image) }, select: { id: true } });
      if (input.stock > 0) await moveStock(tx, session, row.id, input.stock, 'receive', { note: 'สต็อกตั้งต้น' });
      return toProduct(await tx.product.findUniqueOrThrow({ where: { id: row.id }, ...PRODUCT_QUERY }));
    });
  } catch (error) {
    return taken(error);
  }
}

/** แก้ข้อมูลสินค้า (จำนวนสต็อกแก้ผ่าน changeStock เท่านั้น) · คืนค่าเดิมไว้บันทึก audit */
export async function updateProduct(session: Session, branch: string, input: ProductInput, image: ProductImageInput): Promise<{ before: ProductDto; after: ProductDto }> {
  await authorize(session, 'products.manage');
  await authorizeProductBranch(session, branch);
  const db = prismaAs(session);
  const found = await db.product.findFirst({ where: { id: input.id, branch }, ...PRODUCT_QUERY });
  if (!found) throw new Error('NOT_FOUND');
  try {
    const row = await db.product.update({ where: { id: input.id }, data: { name: input.name, category: input.category, priceSatang: input.price, lowStock: input.lowStock, active: input.active, ...imageColumns(image) }, ...PRODUCT_QUERY });
    return { before: toProduct(found), after: toProduct(row) };
  } catch (error) {
    return taken(error);
  }
}

/** ลบสินค้า — เคยขายแล้วลบไม่ได้ (บิลเดิมอ้างอยู่) ให้ปิดขายแทน */
export async function deleteProduct(session: Session, branch: string, id: string): Promise<{ name: string }> {
  await authorize(session, 'products.manage');
  await authorizeProductBranch(session, branch);
  return transaction(session, async tx => {
    const found = await tx.product.findFirst({ where: { id, branch }, ...PRODUCT_QUERY });
    if (!found) throw new Error('NOT_FOUND');
    if (found._count.saleItems > 0) throw new Error('PRODUCT_IN_USE');
    await tx.product.delete({ where: { id } });
    return { name: found.name };
  });
}

/** รูปสินค้าสำหรับ route /api/products/<id>/image — คนขายและผู้จัดการสินค้าดูได้ */
export async function getProductImage(session: Session, id: string): Promise<{ data: string; contentType: string } | null> {
  if (!can(session, 'sales.use') && !can(session, 'products.manage')) throw new ForbiddenError();
  const row = await prisma().product.findFirst({
    where: { id, ...(session.role === 'admin' ? {} : { branch: session.branch }) },
    select: { imageData: true, imageContentType: true },
  });
  return row?.imageData && row.imageContentType ? { data: row.imageData, contentType: row.imageContentType } : null;
}

/** รับของเข้า (+qty) หรือปรับยอดตามที่นับได้จริง (ตั้งเป็น qty) */
export async function changeStock(session: Session, branch: string, input: { productId: string; mode: 'receive' | 'adjust'; qty: number; note: string | null }): Promise<{ name: string; change: number; balance: number }> {
  await authorize(session, 'products.manage');
  await authorizeProductBranch(session, branch);
  return transaction(session, async tx => {
    await lockProducts(tx, [input.productId]);
    const p = await tx.product.findFirst({ where: { id: input.productId, branch } });
    if (!p) throw new Error('NOT_FOUND');
    const change = input.mode === 'receive' ? input.qty : input.qty - p.stock;
    const balance = change === 0 ? p.stock : await moveStock(tx, session, p.id, change, input.mode, { note: input.note });
    return { name: p.name, change, balance };
  });
}

/* ---------- ขายหน้าร้าน ---------- */

/** เปิดบิล: ตรวจสต็อก ตัดสต็อก ออกเลขใบเสร็จ ใน transaction เดียว (ชำระที่เคาน์เตอร์ทันที) */
export async function createSale(session: Session, input: { method: PaymentMethod; items: { productId: string; qty: number }[]; couponCode?: string | null; couponProof?: boolean; slip?: { data: string; contentType: string } }): Promise<SaleDto> {
  await authorize(session, 'sales.use');
  if (session.role === 'member' && input.method === 'promptpay' && !input.slip && !input.couponCode) throw new Error('SLIP_REQUIRED');
  // รวมสินค้าซ้ำในตะกร้า
  const qtyOf = new Map<string, number>();
  for (const i of input.items) qtyOf.set(i.productId, (qtyOf.get(i.productId) ?? 0) + i.qty);
  const ids = [...qtyOf.keys()];
  return transaction(session, async tx => {
    await assertPaymentMethodEnabled(tx, session.branch, input.method);
    await lockProducts(tx, ids);
    const products = await tx.product.findMany({ where: { id: { in: ids }, branch: session.branch } });
    if (products.length !== ids.length) throw new Error('NOT_FOUND');
    for (const p of products) {
      if (!p.active) throw new Error('PRODUCT_INACTIVE');
      if (p.stock < (qtyOf.get(p.id) ?? 0)) throw new Error(`OUT_OF_STOCK:${p.name} (เหลือ ${String(p.stock)})`);
    }
    const lines = products.map(p => ({ productId: p.id, name: p.name, priceSatang: p.priceSatang, qty: qtyOf.get(p.id) ?? 0 }));
    const listPriceSatang = lines.reduce((sum, line) => sum + line.priceSatang * line.qty, 0);
    const coupon = input.couponCode
      ? await resolvePurchaseCoupon(tx, input.couponCode, {
        target: 'product',
        priceSatang: listPriceSatang,
        memberId: session.memberId ?? null,
        selfService: session.role === 'member',
        proofChecked: input.couponProof ?? false,
      })
      : null;
    const discountSatang = coupon?.discountSatang ?? 0;
    if (session.role === 'member' && input.method === 'promptpay' && !input.slip && listPriceSatang > discountSatang) throw new Error('SLIP_REQUIRED');
    const sale = await tx.sale.create({
      data: {
        receiptNo: await nextReceiptNo(tx, session.branch),
        method: input.method,
        totalSatang: listPriceSatang - discountSatang,
        listPriceSatang,
        discountSatang,
        couponCode: coupon?.code ?? null,
        couponMemberId: coupon ? session.memberId ?? null : null,
        slipData: input.slip?.data,
        slipContentType: input.slip?.contentType,
        createdAt: now(),
        items: { create: lines },
      },
    });
    if (coupon) await tx.coupon.update({ where: { code: coupon.code }, data: { used: { increment: 1 } } });
    for (const l of lines) await moveStock(tx, session, l.productId, -l.qty, 'sale', { saleId: sale.id });
    return toSale(await tx.sale.findUniqueOrThrow({ where: { id: sale.id }, ...SALE_QUERY }));
  });
}

export async function getSaleSlip(session: Session, id: string): Promise<{ data: string; contentType: string } | null> {
  await authorize(session, 'sales.use');
  const row = await prismaAs(session).sale.findUnique({
    where: { id },
    select: { createdById: true, slipData: true, slipContentType: true },
  });
  if (!row) return null;
  if (!await canAccessSale(session, row.createdById)) throw new ForbiddenError();
  return row.slipData && row.slipContentType ? { data: row.slipData, contentType: row.slipContentType } : null;
}

export async function getSaleReceipt(session: Session, id: string): Promise<{ sale: SaleDto; branch: string } | null> {
  await authorize(session, 'sales.use');
  const db = prismaAs(session);
  const sale = await db.sale.findUnique({ where: { id }, ...SALE_QUERY });
  if (!sale) return null;
  if (!await canAccessSale(session, sale.createdById)) return null;
  const creator = sale.createdById
    ? await db.user.findUnique({ where: { id: sale.createdById }, select: { branch: true } })
    : null;
  return { sale: toSale(sale), branch: creator?.branch ?? session.branch };
}

/** ตัวเลือกสาขาสำหรับตัวกรองบิล — admin เท่านั้น */
export async function salesBranchOptions(session: Session): Promise<string[]> {
  await authorize(session, 'sales.use');
  if (session.role !== 'admin') return [];
  const [active, users] = await Promise.all([
    activeBranchNames(),
    prisma().user.findMany({ distinct: ['branch'], select: { branch: true } }),
  ]);
  return [...new Set([...active, ...users.map(user => user.branch), session.branch])];
}

/** บิลในช่วงวันที่จากสาขาที่ session มีสิทธิ์ดู (admin เลือกได้, สมาชิกเห็นรายการตัวเอง) */
export async function listSales(session: Session, date: string | DateRange = today(), requestedBranch?: string): Promise<SaleDto[]> {
  await authorize(session, 'sales.use');
  const span = typeof date === 'string' ? bangkokSpan(date) : bangkokSpan(date.from, date.to);
  const branch = session.role === 'admin' ? requestedBranch : session.role === 'member' ? undefined : session.branch;
  const creatorIds = session.role === 'member'
    ? [session.userId]
    : branch
      ? (await prisma().user.findMany({ where: { branch }, select: { id: true } })).map(user => user.id)
      : null;
  const rows = await prismaAs(session).sale.findMany({
    where: { createdAt: span, ...(creatorIds ? { createdById: { in: creatorIds } } : {}) },
    ...SALE_QUERY,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toSale);
}

/** ยกเลิกบิลและคืนสต็อก — เคาน์เตอร์ยกเลิกได้เฉพาะบิลวันนี้ · ผู้จัดการสินค้ายกเลิกบิลย้อนหลังได้ */
export async function voidSale(session: Session, id: string): Promise<SaleDto> {
  await authorize(session, 'sales.use');
  if (session.role === 'member') throw new ForbiddenError();
  return transaction(session, async tx => {
    const sale = await tx.sale.findUnique({ where: { id }, ...SALE_QUERY });
    if (!sale) throw new Error('NOT_FOUND');
    if (sale.voidedAt) throw new Error('SALE_VOIDED');
    if (!await canAccessSale(session, sale.createdById)) throw new ForbiddenError();
    const saleBranch = sale.createdById
      ? await tx.user.findUnique({ where: { id: sale.createdById }, select: { branch: true } })
      : null;
    const productIds = [...new Set(sale.items.map(item => item.productId))];
    if (!saleBranch || await tx.product.count({ where: { id: { in: productIds }, branch: saleBranch.branch } }) !== productIds.length) {
      throw new Error('SALE_PRODUCT_BRANCH_MISMATCH');
    }
    if (!can(session, 'products.manage') && bangkokDate(sale.createdAt) !== today()) {
      throw new ForbiddenError();
    }
    await lockProducts(tx, sale.items.map(i => i.productId));
    await tx.sale.update({ where: { id }, data: { voidedAt: now(), voidedByName: session.name } });
    if (sale.couponCode) await tx.coupon.updateMany({ where: { code: sale.couponCode, used: { gt: 0 } }, data: { used: { decrement: 1 } } });
    for (const i of sale.items) await moveStock(tx, session, i.productId, i.qty, 'void', { saleId: id, note: `ยกเลิกบิล ${sale.receiptNo}` });
    return toSale(await tx.sale.findUniqueOrThrow({ where: { id }, ...SALE_QUERY }));
  });
}
