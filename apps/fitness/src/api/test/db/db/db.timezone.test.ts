import { describe, expect, it } from 'vitest';
import type { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { bangkokSpan, thaiSession } from '@/api/lib/db/db/db';
import { fromThaiClock, thaiTime } from '@/api/lib/db/db/db.thai-time';
import { PrismaClient } from '@/api/lib/db/db/generated/prisma/client';

describe('thaiSession', () => {
  it('ตั้ง time_zone ของ session เป็นเวลาไทย', () => {
    expect(thaiSession('mysql://u:p@db:3306/fitflow')).toBe('mysql://u:p@db:3306/fitflow?timezone=%2B07%3A00');
    expect(thaiSession('mysql://u:p@db/fitflow?connectionLimit=5')).toBe('mysql://u:p@db/fitflow?connectionLimit=5&timezone=%2B07%3A00');
  });
  it('ตั้ง timezone ไว้เองแล้ว ไม่ทับ', () => {
    expect(thaiSession('mysql://u:p@db/fitflow?timezone=Z')).toBe('mysql://u:p@db/fitflow?timezone=Z');
  });
});

describe('bangkokSpan', () => {
  it('ทั้งวันตามเวลาไทย = 17:00Z ของวันก่อน ถึง 17:00Z ของวันนั้น', () => {
    const span = bangkokSpan('2026-10-15');
    expect(span.gte.toISOString()).toBe('2026-10-14T17:00:00.000Z');
    expect(span.lt.toISOString()).toBe('2026-10-15T17:00:00.000Z');
  });
});

describe('fromThaiClock', () => {
  it('ค่าใน DB เป็นนาฬิกาไทย → instant UTC', () => {
    expect(fromThaiClock('2026-10-15T18:31:00+00:00')).toBe('2026-10-15T11:31:00+00:00');
    expect(fromThaiClock('2026-10-15T03:00:00.250+00:00')).toBe('2026-10-14T20:00:00.250+00:00');
  });
});

/** adapter จำลอง: จดค่าที่ส่งเข้า SQL และตอบแถวที่กำหนด (ไม่ต้องมีฐานข้อมูล) */
function fakeDb(rows: { columnNames: string[]; columnTypes: number[]; rows: unknown[][] }) {
  const sent: { sql: string; args: unknown[] }[] = [];
  const q = {
    provider: 'mysql', adapterName: '@prisma/adapter-mariadb',
    queryRaw: (x: { sql: string; args: unknown[] }) => { sent.push(x); return Promise.resolve(x.sql.startsWith('SELECT') ? rows : { columnNames: [], columnTypes: [], rows: [] }); },
    executeRaw: (x: { sql: string; args: unknown[] }) => { sent.push(x); return Promise.resolve(1); },
  };
  const adapter = {
    ...q,
    getConnectionInfo: () => ({ schemaName: 'fitflow', supportsRelationJoins: false }),
    startTransaction: () => Promise.resolve({ ...q, options: { usePhantomQuery: true }, commit: () => Promise.resolve(), rollback: () => Promise.resolve() }),
    executeScript: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
  };
  const factory = { provider: 'mysql', adapterName: '@prisma/adapter-mariadb', connect: () => Promise.resolve(adapter) } as unknown as PrismaMariaDb;
  return { db: new PrismaClient({ adapter: thaiTime(factory) }), sent };
}

const fmt = (v: unknown) => (v instanceof Date ? v.toISOString() : v);

describe('thaiTime (เก็บ DATETIME เป็นเวลาไทย)', () => {
  it('เขียน: DATETIME บวก 7 ชั่วโมง ส่วน DATE ไม่แตะ', async () => {
    const { db, sent } = fakeDb({ columnNames: [], columnTypes: [], rows: [] });
    await db.member.findMany({ where: { joinedOn: new Date('2026-10-15T00:00:00Z'), lastCheckInAt: { gte: new Date('2026-10-15T11:31:00Z') } } });
    expect(sent[0]?.args.map(fmt)).toEqual(['2026-10-15T00:00:00.000Z', '2026-10-15T18:31:00.000Z']);
  });

  it('เขียนในทรานแซกชันก็แปลง', async () => {
    const { db, sent } = fakeDb({ columnNames: [], columnTypes: [], rows: [] });
    await db.$transaction(tx => tx.checkIn.findMany({ where: { at: { lt: new Date('2026-10-15T17:00:00Z') } } }));
    expect(sent.flatMap(s => s.args).map(fmt)).toContain('2026-10-16T00:00:00.000Z');
  });

  it('อ่าน: ค่า DATETIME ใน DB เป็นนาฬิกาไทย → Date ที่ถูกต้อง · DATE ไม่แตะ', async () => {
    const { db } = fakeDb({
      columnNames: ['id', 'member_id', 'at', 'checked_out_at', 'allowed', 'created_by_id', 'created_by_name'],
      columnTypes: [7, 7, 10, 10, 1, 7, 7],
      rows: [['c-1', 'm-1', '2026-10-15T18:31:00+00:00', null, 1, null, null]],
    });
    const [row] = await db.checkIn.findMany();
    expect(row?.at.toISOString()).toBe('2026-10-15T11:31:00.000Z');
    expect(row?.checkedOutAt).toBeNull();
  });
});
