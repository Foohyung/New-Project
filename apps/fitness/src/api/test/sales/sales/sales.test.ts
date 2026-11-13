import { beforeEach, describe, expect, it } from 'vitest';
import { changeStock, createSale, getSaleReceipt, listProductBranches, listProducts, listSales, voidSale } from '@/api/dal/sales/sales/sales.dal';
import { prisma } from '@/api/lib/db/db/db';
import { ProductCreateSchema, SaleSchema, StockChangeSchema } from '@/api/schemas/sales/sales/sales.schema';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

describe('ฟอร์มสินค้า', () => {
  it('แปลงราคาเป็นสตางค์และสต็อกเป็นตัวเลข', () => {
    expect(ProductCreateSchema.parse({ name: 'น้ำดื่ม 600 มล.', category: 'เครื่องดื่ม', price: '15', stock: '24', lowStock: '6', active: 'on' })).toEqual({ name: 'น้ำดื่ม 600 มล.', category: 'เครื่องดื่ม', price: 1500, stock: 24, lowStock: 6, active: true });
  });

  it('สต็อกติดลบไม่ได้', () => {
    expect(ProductCreateSchema.safeParse({ name: 'น้ำดื่ม', category: 'เครื่องดื่ม', price: '15', stock: '-1', lowStock: '5' }).success).toBe(false);
  });
});

describe('รับของเข้า / ปรับยอด', () => {
  it('รับเข้าต้องอย่างน้อย 1 ชิ้น แต่ปรับยอดเป็น 0 ได้', () => {
    expect(StockChangeSchema.safeParse({ productId: 'p1', mode: 'receive', qty: '0' }).success).toBe(false);
    expect(StockChangeSchema.safeParse({ productId: 'p1', mode: 'adjust', qty: '0' }).success).toBe(true);
    expect(StockChangeSchema.parse({ productId: 'p1', mode: 'receive', qty: '12', note: '' }).note).toBeNull();
  });
});

describe('บิลขาย', () => {
  it('อ่านตะกร้าจาก JSON', () => {
    expect(SaleSchema.parse({ method: 'cash', items: '[{"productId":"p1","qty":2}]' })).toEqual({
      method: 'cash',
      couponCode: null,
      couponProof: false,
      items: [{ productId: 'p1', qty: 2 }],
    });
  });

  it('ตะกร้าว่าง JSON เสีย หรือจำนวน 0 ไม่ผ่าน', () => {
    expect(SaleSchema.safeParse({ method: 'cash', items: '[]' }).success).toBe(false);
    expect(SaleSchema.safeParse({ method: 'cash', items: 'not json' }).success).toBe(false);
    expect(SaleSchema.safeParse({ method: 'cash', items: '[{"productId":"p1","qty":0}]' }).success).toBe(false);
    expect(SaleSchema.safeParse({ method: 'bitcoin', items: '[{"productId":"p1","qty":1}]' }).success).toBe(false);
  });

  it('สมาชิกต้องแนบสลิปเมื่อซื้อด้วย PromptPay', async () => {
    await expect(createSale(USERS.member, { method: 'promptpay', items: [{ productId: 'prod-water', qty: 1 }] })).rejects.toThrow('SLIP_REQUIRED');
  });
});

describeDb('สิทธิ์ซื้อสินค้าหน้าร้าน', () => {
  beforeEach(resetDatabase, 30_000);

  it('แยกสินค้าและสต็อกตามสาขา และให้ admin เลือกดูรายละเอียดแต่ละสาขา', async () => {
    await prisma().branch.create({ data: { name: 'สาขาอื่น' } });
    await prisma().product.create({
      data: {
        branch: 'สาขาอื่น',
        name: 'สินค้าอีกสาขา',
        category: 'อุปกรณ์',
        priceSatang: 1000,
        stock: 3,
      },
    });

    expect(await listProducts(USERS.owner)).toHaveLength(6);
    const otherBranchProducts = await listProducts(USERS.admin, { branch: 'สาขาอื่น' });
    expect(otherBranchProducts).toHaveLength(1);
    expect(otherBranchProducts).toMatchObject([{ name: 'สินค้าอีกสาขา', stock: 3 }]);
    expect(await listProductBranches(USERS.admin)).toMatchObject([
      { branch: USERS.admin.branch, productCount: 6 },
      { branch: 'สาขาอื่น', productCount: 1 },
    ]);
    await expect(changeStock(USERS.manager, 'สาขาอื่น', { productId: 'prod-water', mode: 'receive', qty: 1, note: null })).rejects.toThrow('FORBIDDEN');
    const otherBranchProduct = otherBranchProducts[0];
    if (!otherBranchProduct) throw new Error('Missing product fixture for the other branch');
    await expect(createSale(USERS.manager, { method: 'cash', items: [{ productId: otherBranchProduct.id, qty: 1 }] })).rejects.toThrow('NOT_FOUND');
  });

  it('พนักงานเห็นบิลของสาขาตัวเอง สมาชิกเห็นเฉพาะบิลตัวเอง และ admin เห็นทุกสาขา', async () => {
    for (const session of Object.values(USERS)) {
      await createSale(session, { method: 'cash', items: [{ productId: 'prod-water', qty: 1 }] });
    }

    expect(await listSales(USERS.admin)).toHaveLength(Object.keys(USERS).length);
    expect(await listSales(USERS.trainer)).toHaveLength(Object.keys(USERS).length);
    expect(await listSales(USERS.member)).toHaveLength(1);
    expect(await listSales({ ...USERS.trainer, branch: 'สาขาอื่น' })).toHaveLength(0);
  });

  it('ยกเลิกได้เฉพาะบิลของตัวเองสำหรับ role ที่ไม่มีสิทธิ์จัดการสินค้า', async () => {
    const ownSale = await createSale(USERS.member, { method: 'cash', items: [{ productId: 'prod-water', qty: 1 }] });
    const otherSale = await createSale(USERS.trainer, { method: 'cash', items: [{ productId: 'prod-water', qty: 1 }] });

    await expect(voidSale(USERS.member, otherSale.id)).rejects.toThrow('FORBIDDEN');
    const voidedSale = await voidSale(USERS.member, ownSale.id);
    expect(voidedSale.id).toBe(ownSale.id);
    expect(voidedSale.voidedAt).not.toBeNull();
  });

  it('ใช้ส่วนลดคูปองกับสินค้าและคืนสิทธิ์เมื่อยกเลิกบิล', async () => {
    await prisma().coupon.create({
      data: {
        code: 'PRODUCT10',
        description: 'ส่วนลดสินค้า',
        type: 'percent',
        value: 10,
        appliesTo: ['product'],
        startsOn: new Date('2020-01-01'),
      },
    });

    const sale = await createSale(USERS.member, { method: 'cash', items: [{ productId: 'prod-water', qty: 1 }], couponCode: 'PRODUCT10' });
    expect(sale.discountSatang).toBe(Math.round(sale.listPriceSatang * 0.1));
    expect(sale.totalSatang).toBe(sale.listPriceSatang - sale.discountSatang);
    expect((await prisma().coupon.findUniqueOrThrow({ where: { code: 'PRODUCT10' } })).used).toBe(1);

    await voidSale(USERS.manager, sale.id);
    expect((await prisma().coupon.findUniqueOrThrow({ where: { code: 'PRODUCT10' } })).used).toBe(0);
  });

  it('พิมพ์ใบเสร็จได้เฉพาะบิลของตัวเองหรือบิลในสาขาตัวเอง', async () => {
    const ownSale = await createSale(USERS.member, { method: 'cash', items: [{ productId: 'prod-water', qty: 1 }] });
    expect(await getSaleReceipt(USERS.member, ownSale.id)).toMatchObject({ sale: { receiptNo: ownSale.receiptNo }, branch: USERS.member.branch });
    expect(await getSaleReceipt(USERS.trainer, ownSale.id)).toMatchObject({ sale: { receiptNo: ownSale.receiptNo }, branch: USERS.trainer.branch });
    expect(await getSaleReceipt(USERS.admin, ownSale.id)).toMatchObject({ sale: { receiptNo: ownSale.receiptNo } });
  });
});
