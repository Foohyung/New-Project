import { beforeEach, describe, expect, it } from 'vitest';
import { getReport, getReportBranches } from '@/api/dal/reports/reports/reports.dal';
import { createSale } from '@/api/dal/sales/sales/sales.dal';
import { prisma } from '@/api/lib/db/db/db';
import { today } from '@/api/lib/clock/clock/clock';
import { average, mergeDaily, sumRange, toCsv } from '@/api/services/reports/reports/reports.service';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

describe('รวมยอดรายวัน', () => {
  it('รวมค่าวันเดียวกันจากหลายชุดและเรียงตามวัน', () => {
    const merged = mergeDaily([{ date: '2026-10-02', value: 5 }, { date: '2026-10-01', value: 1 }], [{ date: '2026-10-02', value: 2 }]);
    expect(merged).toEqual([{ date: '2026-10-01', value: 1 }, { date: '2026-10-02', value: 7 }]);
    expect(sumRange(merged, '2026-10-02', '2026-10-31')).toBe(7);
    expect(average([])).toBe(0);
  });
});

describe('toCsv', () => {
  it('มี BOM สำหรับ Excel ภาษาไทย และ escape เครื่องหมายคำพูด', () => {
    const csv = toCsv([['ชื่อ', 'หมายเหตุ'], ['ณัฐพล', 'พูดว่า "สวัสดี", ครับ']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"พูดว่า ""สวัสดี"", ครับ"');
  });
  it('กัน CSV injection โดยใส่ \' หน้าค่าที่ขึ้นต้นเหมือนสูตร', () => {
    expect(toCsv([['=HYPERLINK("x")', -5]])).toContain(`"'=HYPERLINK(""x"")",-5`);
  });
});

describeDb('รายงานแยกตามสาขาและแหล่งรายได้', () => {
  beforeEach(resetDatabase, 30_000);

  it('admin เลือกสาขาได้ แต่ role อื่นเปลี่ยนไปดูสาขาที่ไม่ได้รับผิดชอบไม่ได้', async () => {
    const branch = 'สาขารายงานทดสอบ';
    await prisma().branch.create({ data: { name: branch } });

    expect(await getReportBranches(USERS.admin)).toContain(branch);
    expect(await getReportBranches(USERS.manager)).toEqual([USERS.manager.branch]);
    expect((await getReport(USERS.admin, null, branch)).branch).toBe(branch);
    expect((await getReport(USERS.manager, null, branch)).branch).toBeNull();
  });

  it('รายงานสาขาแสดงรายละเอียดสินค้าที่ขายและรวมยอดเข้ากับรายได้', async () => {
    const branch = 'สาขารายงานขายสินค้า';
    await prisma().branch.create({ data: { name: branch } });
    const seller = await prisma().user.create({
      data: { login: 'report-seller', passwordHash: 'test-hash', role: 'front-desk', name: 'พนักงานขาย', nickname: 'ขาย', branch },
    });
    const session = { ...USERS['front-desk'], userId: seller.id, name: seller.name, branch };
    const product = await prisma().product.findUniqueOrThrow({ where: { id: 'prod-water' }, select: { name: true, priceSatang: true } });
    await createSale(session, { method: 'cash', items: [{ productId: 'prod-water', qty: 2 }] });

    const report = await getReport(USERS.admin, { from: today(), to: today() }, branch);
    expect(report.otherIncome.salesSatang).toBe(product.priceSatang * 2);
    expect(report.otherIncome.salesCount).toBe(1);
    expect(report.byProduct).toEqual([{ id: `prod-water:${product.name}`, name: product.name, satang: product.priceSatang * 2, quantity: 2 }]);
    expect(report.revenue.totalSatang).toBeGreaterThanOrEqual(product.priceSatang * 2);
  });
});
