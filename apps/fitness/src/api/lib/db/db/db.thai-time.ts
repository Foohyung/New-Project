import type { PrismaMariaDb } from '@prisma/adapter-mariadb';

/*
 * เก็บคอลัมน์ DATETIME เป็นเวลาไทย (UTC+7) ในฐานข้อมูล — เปิด DB ดูตรง ๆ ได้เวลาเดียวกับหน้าจอ
 * ในโค้ดยังเป็น Date / ISO (UTC) เหมือนเดิม: ตอนเขียนบวก 7 ชั่วโมง ตอนอ่านตีความค่าใน DB เป็น +07:00
 * คอลัมน์ DATE / TIME ไม่แปลง (วันล้วนตามเวลาไทยอยู่แล้ว) · ประเทศไทยไม่มี daylight saving จึงบวกตรง ๆ ได้
 */

type Adapter = Awaited<ReturnType<PrismaMariaDb['connect']>>;
type Transaction = Awaited<ReturnType<Adapter['startTransaction']>>;
type SqlQuery = Parameters<Adapter['queryRaw']>[0];
type ResultSet = Awaited<ReturnType<Adapter['queryRaw']>>;
type ArgType = SqlQuery['argTypes'][number];

export const THAI_OFFSET_MS = 7 * 3_600_000;
/** ColumnTypeEnum.DateTime ของ @prisma/driver-adapter-utils */
const DATETIME_COLUMN = 10;
const NOT_DATETIME = new Set(['DATE', 'NEWDATE', 'TIME', 'TIME2']);

function shiftArg(arg: unknown): unknown {
  if (Array.isArray(arg)) return arg.map(shiftArg);
  if (arg instanceof Date) return new Date(arg.getTime() + THAI_OFFSET_MS);
  if (typeof arg === 'string') return new Date(new Date(arg).getTime() + THAI_OFFSET_MS);
  return arg;
}

/** ค่าเวลาที่ส่งเข้า SQL → นาฬิกาไทย (adapter จัดรูปด้วยเวลา UTC ของ Date จึงเลื่อนไป 7 ชั่วโมงก่อน) */
export function thaiArgs(query: SqlQuery): SqlQuery {
  const isDateTime = (t: ArgType | undefined) => t?.scalarType === 'datetime' && !NOT_DATETIME.has(t.dbType ?? '');
  if (!query.argTypes.some(isDateTime)) return query;
  return { ...query, args: query.args.map((arg, i) => (arg !== null && isDateTime(query.argTypes[i]) ? shiftArg(arg) : arg)) };
}

/** "2026-10-15T18:31:00+00:00" ที่ adapter อ่านจาก DB (ซึ่งจริง ๆ เป็นนาฬิกาไทย) → instant UTC ที่ถูกต้อง */
export function fromThaiClock(value: string): string {
  return new Date(value.replace(/(Z|[+-]00:?00)$/, '') + '+07:00').toISOString().replace(/(\.000)?Z$/, '+00:00');
}

export function thaiResult(result: ResultSet): ResultSet {
  const cols = result.columnTypes.flatMap((t, i) => (t === DATETIME_COLUMN ? [i] : []));
  if (!cols.length) return result;
  return {
    ...result,
    rows: result.rows.map(row => {
      const out = [...row];
      for (const i of cols) if (typeof out[i] === 'string') out[i] = fromThaiClock(out[i]);
      return out;
    }),
  };
}

function wrapQueryable<T extends Pick<Adapter, 'queryRaw' | 'executeRaw'>>(target: T): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      if (key === 'queryRaw') return async (q: SqlQuery) => thaiResult(await obj.queryRaw(thaiArgs(q)));
      if (key === 'executeRaw') return (q: SqlQuery) => obj.executeRaw(thaiArgs(q));
      if (key === 'startTransaction') {
        return async (...args: Parameters<Adapter['startTransaction']>) => wrapQueryable<Transaction>(await (obj as unknown as Adapter).startTransaction(...args));
      }
      const value: unknown = Reflect.get(obj, key, receiver);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(obj) : value;
    },
  });
}

/** ครอบ adapter ของ Prisma ให้คอลัมน์ DATETIME ใน DB เป็นเวลาไทย — ใช้ new PrismaClient({ adapter: thaiTime(new PrismaMariaDb(url)) }) */
export function thaiTime(factory: PrismaMariaDb): PrismaMariaDb {
  return new Proxy(factory, {
    get(obj, key, receiver) {
      if (key === 'connect') return async () => wrapQueryable(await obj.connect());
      const value: unknown = Reflect.get(obj, key, receiver);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(obj) : value;
    },
  });
}
