import 'server-only';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '@/api/lib/db/db/generated/prisma/client';
import type * as Row from '@/api/lib/db/db/generated/prisma/client';
import type { CouponLike } from '@/api/services/coupons/coupons/coupons.service';
import type { Channel, ReminderRound, RoundId } from '@/api/services/reminders/reminders/reminders.service';
import type { BodyProfile } from '@/api/services/nutrition/nutrition/nutrition.service';
import type { FollowUpStage } from '@/api/services/retention/retention/retention.service';
import type { SavedCard } from '@/api/services/subscriptions/subscriptions/subscriptions.service';

/*
 * ฐานข้อมูล MySQL ผ่าน Prisma (โครงสร้างอยู่ที่ prisma/schema.prisma)
 * DAL (src/api/dal/<เรื่อง>/<เรื่อง>/<เรื่อง>.dal.ts) ทำงานกับ "record" รูปแบบเดิม (วันที่เป็นข้อความ YYYY-MM-DD, เวลาเป็น ISO) — แปลงจาก/เป็นแถวของตารางที่ไฟล์นี้
 */

const holder = globalThis as unknown as { __ffPrisma?: PrismaClient };

/** Prisma client ตัวเดียวทั้ง process (เก็บบน globalThis ไม่ให้เปิด connection ซ้ำตอน hot reload) */
export function prisma(): PrismaClient {
  if (!holder.__ffPrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('ยังไม่ได้ตั้ง DATABASE_URL ใน .env');
    holder.__ffPrisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  }
  return holder.__ffPrisma;
}

export type Tx = Prisma.TransactionClient;

/* ---------- ใครสร้าง/แก้ล่าสุด (created_by_id/name / updated_by_id/name) — docs/AUDIT.md ---------- */

/** ตารางที่มี created_by_id/name + updated_by_id/name */
const STAMPED: ReadonlySet<string> = new Set(['User', 'Package', 'Member', 'Trainer', 'GymClass', 'Booking', 'PtSession', 'Payment', 'Coupon', 'Charge', 'ReminderRound', 'ReminderLog', 'FollowUp', 'WorkoutPlan', 'HealthProfile', 'MealLog']);
/** ตาราง append-only ที่มีแค่ created_by_id/name */
const CREATED_ONLY: ReadonlySet<string> = new Set(['CheckIn']);

export type ActorInfo = { userId?: string | null; name?: string | null };

function actorDetails(actor: ActorInfo | null) {
  const id = actor?.userId ?? null;
  const name = actor?.name ?? (id ? null : 'ระบบ');
  return { id, name };
}

function stampCreate<T>(model: string, data: T, actor: ActorInfo | null): T {
  const { id, name } = actorDetails(actor);
  if (STAMPED.has(model)) return { ...data, createdById: id, createdByName: name, updatedById: id, updatedByName: name };
  if (CREATED_ONLY.has(model)) return { ...data, createdById: id, createdByName: name };
  return data;
}
const stampUpdate = <T>(model: string, data: T, actor: ActorInfo | null): T => {
  const { id, name } = actorDetails(actor);
  return STAMPED.has(model) ? { ...data, updatedById: id, updatedByName: name } : data;
};

/**
 * Prisma client ที่เติม createdById/createdByName / updatedById/updatedByName ให้ทุกการเขียนอัตโนมัติ (DAL ลืมไม่ได้)
 * actor = ผู้ใช้จาก session · null = งานระบบ (cron, webhook)
 * query extension ไม่เปลี่ยน type ของ client จึงคืนเป็น PrismaClient ได้ตรง ๆ
 */
export function prismaAs(actor: ActorInfo | null): PrismaClient {
  return prisma().$extends({
    query: {
      $allModels: {
        create({ model, args, query }) {
          args.data = stampCreate(model, args.data, actor);
          return query(args);
        },
        createMany({ model, args, query }) {
          args.data = (Array.isArray(args.data) ? args.data.map(d => stampCreate(model, d, actor)) : stampCreate(model, args.data, actor)) as typeof args.data;
          return query(args);
        },
        update({ model, args, query }) {
          args.data = stampUpdate(model, args.data, actor);
          return query(args);
        },
        updateMany({ model, args, query }) {
          args.data = stampUpdate(model, args.data, actor);
          return query(args);
        },
        upsert({ model, args, query }) {
          args.create = stampCreate(model, args.create, actor);
          args.update = stampUpdate(model, args.update, actor);
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

/** ทำหลายคำสั่งใน transaction เดียว (สำเร็จทั้งหมดหรือไม่เกิดเลย) — ทุกการเขียนบันทึกผู้ทำจาก actor */
export function transaction<T>(actor: ActorInfo | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prismaAs(actor).$transaction(fn);
}

export { Prisma };

/* ---------- แปลงวันที่ ---------- */

/** DATE ของ MySQL → 'YYYY-MM-DD' */
export const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
export const dayOrNull = (d: Date | null): string | null => (d ? dayOf(d) : null);
/** 'YYYY-MM-DD' → ค่าสำหรับคอลัมน์ DATE */
export const asDay = (s: string): Date => new Date(`${s}T00:00:00Z`);
export const asDayOrNull = (s: string | null): Date | null => (s ? asDay(s) : null);
export const isoOrNull = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** เวลาเริ่มวันตามเวลาไทยของวันที่ 'YYYY-MM-DD' */
export const bangkokStart = (date: string): Date => new Date(`${date}T00:00:00+07:00`);
/** ช่วงเวลาของวันที่ from ถึง to (รวมทั้งวัน to) ตามเวลาไทย — ใช้กับ where: { at: bangkokSpan(...) } */
export const bangkokSpan = (from: string, to: string = from): { gte: Date; lt: Date } => ({ gte: bangkokStart(from), lt: new Date(bangkokStart(to).getTime() + 86_400_000) });

/** ตัวเลขต่อเนื่อง (รหัสสมาชิก / เลขใบเสร็จ) — แถวถูกล็อกระหว่าง transaction จึงไม่ได้เลขซ้ำ */
export async function nextNumber(tx: Tx, name: 'member' | 'receipt'): Promise<number> {
  const row = await tx.counter.upsert({ where: { name }, create: { name, value: 1 }, update: { value: { increment: 1 } } });
  return row.value;
}

/* ---------- record ที่ DAL ใช้ ---------- */

export type PackageKind = Row.PackageKind;

export interface PackageRecord {
  id: string;
  name: string;
  kind: PackageKind;
  months?: number;
  days?: number;
  sessions?: number;
  priceSatang: number;
  description: string;
  active: boolean;
}

export interface MemberRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  joinedOn: string;
  packageId: string;
  expiresOn: string;
  /** ช่วงพักสมาชิก (วันสุดท้ายของการพัก = until) */
  freeze: { from: string; until: string } | null;
  ptSessionsLeft: number;
  lastCheckInAt: string | null;
  note: string | null;
  marketingConsent: boolean;
  autoRenew: { card: SavedCard; since: string } | null;
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  at: string;
  allowed: boolean;
}

export interface TrainerRecord {
  id: string;
  name: string;
  nickname: string;
  specialties: string[];
  bio: string;
  color: string;
}

export interface ClassRecord {
  id: string;
  title: string;
  trainerId: string;
  room: string;
  startsAt: string;
  minutes: number;
  capacity: number;
  level: 'ง่าย' | 'กลาง' | 'หนัก';
  /** ผู้จองนอกระบบ (walk-in ที่เคาน์เตอร์จดไว้) */
  otherBooked: number;
}

export interface BookingRecord {
  id: string;
  classId: string;
  memberId: string;
  createdAt: string;
  status: 'booked' | 'cancelled';
}

export interface PtSessionRecord {
  id: string;
  trainerId: string;
  memberId: string;
  startsAt: string;
  minutes: number;
  status: 'booked' | 'done' | 'cancelled';
}

export type PaymentMethod = Row.PaymentMethod;
export type PaymentStatus = Row.PaymentStatus;

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  memberId: string;
  packageId: string;
  kind: Row.PaymentKind;
  amountSatang: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  applied: boolean;
  coverage: { from: string; to: string } | null;
  receivedBy: string | null;
  listPriceSatang: number;
  discountSatang: number;
  couponCode: string | null;
  bonusDays: number;
}

export interface CouponRecord extends CouponLike {
  description: string;
  createdAt: string;
}

export interface ReminderLogRecord {
  id: string;
  memberId: string;
  roundId: RoundId | 'manual';
  channels: Channel[];
  sentAt: string;
  clicked: boolean;
  paymentId: string | null;
}

export interface ChargeAttempt {
  on: string;
  ok: boolean;
  reason: string | null;
}

export interface ChargeRecord {
  id: string;
  memberId: string;
  packageId: string;
  amountSatang: number;
  dueOn: string;
  attempts: ChargeAttempt[];
  status: Row.ChargeStatus;
  paymentId: string | null;
}

export interface FollowUpRecord {
  memberId: string;
  stage: FollowUpStage;
  note: string;
  by: string;
  updatedAt: string;
}

export interface HealthProfileRecord extends BodyProfile {
  userId: string;
  consentAt: string;
  noticeVersion: string;
  updatedAt: string;
}

/** เวอร์ชันประกาศความเป็นส่วนตัวเรื่องข้อมูลสุขภาพ (บันทึกคู่กับ consent ทุกครั้ง) */
export const HEALTH_NOTICE_VERSION = 'health-2026-10';

/* ---------- แถวของตาราง → record ---------- */

const strings = (value: Prisma.JsonValue): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

export function toPackage(p: Row.Package): PackageRecord {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    ...(p.months === null ? {} : { months: p.months }),
    ...(p.days === null ? {} : { days: p.days }),
    ...(p.sessions === null ? {} : { sessions: p.sessions }),
    priceSatang: p.priceSatang,
    description: p.description,
    active: p.active,
  };
}

export function toMember(m: Row.Member): MemberRecord {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    phone: m.phone,
    email: m.email,
    joinedOn: dayOf(m.joinedOn),
    packageId: m.packageId,
    expiresOn: dayOf(m.expiresOn),
    freeze: m.freezeFrom && m.freezeUntil ? { from: dayOf(m.freezeFrom), until: dayOf(m.freezeUntil) } : null,
    ptSessionsLeft: m.ptSessionsLeft,
    lastCheckInAt: isoOrNull(m.lastCheckInAt),
    note: m.note,
    marketingConsent: m.marketingConsent,
    autoRenew: m.cardBrand && m.cardLast4 && m.autoRenewSince ? { card: { brand: m.cardBrand, last4: m.cardLast4, exp: m.cardExp ?? '' }, since: dayOf(m.autoRenewSince) } : null,
  };
}

export const toCheckIn = (c: Row.CheckIn): CheckInRecord => ({ id: c.id, memberId: c.memberId, at: c.at.toISOString(), allowed: c.allowed });

export const toTrainer = (t: Row.Trainer): TrainerRecord => ({ id: t.id, name: t.name, nickname: t.nickname, specialties: strings(t.specialties), bio: t.bio, color: t.color });

const LEVELS = ['ง่าย', 'กลาง', 'หนัก'] as const;
export const toClass = (c: Row.GymClass): ClassRecord => ({
  id: c.id,
  title: c.title,
  trainerId: c.trainerId,
  room: c.room,
  startsAt: c.startsAt.toISOString(),
  minutes: c.minutes,
  capacity: c.capacity,
  level: LEVELS.find(l => l === c.level) ?? 'กลาง',
  otherBooked: c.otherBooked,
});

export const toBooking = (b: Row.Booking): BookingRecord => ({ id: b.id, classId: b.classId, memberId: b.memberId, createdAt: b.createdAt.toISOString(), status: b.status });

export const toPtSession = (s: Row.PtSession): PtSessionRecord => ({ id: s.id, trainerId: s.trainerId, memberId: s.memberId, startsAt: s.startsAt.toISOString(), minutes: s.minutes, status: s.status });

export function toPayment(p: Row.Payment): PaymentRecord {
  return {
    id: p.id,
    receiptNo: p.receiptNo,
    memberId: p.memberId,
    packageId: p.packageId,
    kind: p.kind,
    amountSatang: p.amountSatang,
    method: p.method,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    paidAt: isoOrNull(p.paidAt),
    applied: p.applied,
    coverage: p.coverageFrom && p.coverageTo ? { from: dayOf(p.coverageFrom), to: dayOf(p.coverageTo) } : null,
    receivedBy: p.receivedBy,
    listPriceSatang: p.listPriceSatang,
    discountSatang: p.discountSatang,
    couponCode: p.couponCode,
    bonusDays: p.bonusDays,
  };
}

export function toCoupon(c: Row.Coupon): CouponRecord {
  return {
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    kind: c.kind,
    packageIds: c.packageIds === null ? null : strings(c.packageIds),
    renewOnly: c.renewOnly,
    newOnly: c.newOnly,
    limit: c.usageLimit,
    used: c.used,
    perMember: c.perMember,
    expiresOn: dayOrNull(c.expiresOn),
    active: c.active,
    ownerMemberId: c.ownerMemberId,
    createdAt: c.createdAt.toISOString(),
  };
}

const CHANNELS: readonly Channel[] = ['line', 'sms', 'email'];
const channelsOf = (value: Prisma.JsonValue): Channel[] => strings(value).filter((c): c is Channel => (CHANNELS as readonly string[]).includes(c));
const ROUND_IDS: readonly RoundId[] = ['before-7', 'before-3', 'on-day', 'after-7'];
const roundIdOf = (id: string): RoundId | undefined => ROUND_IDS.find(r => r === id);

export function toRound(r: Row.ReminderRound): ReminderRound | null {
  const id = roundIdOf(r.id);
  return id ? { id, offsetDays: r.offsetDays, enabled: r.enabled, channels: channelsOf(r.channels), template: r.template, couponCode: r.couponCode } : null;
}

export const toReminderLog = (l: Row.ReminderLog): ReminderLogRecord => ({
  id: l.id,
  memberId: l.memberId,
  roundId: roundIdOf(l.roundId) ?? 'manual',
  channels: channelsOf(l.channels),
  sentAt: l.sentAt.toISOString(),
  clicked: l.clicked,
  paymentId: l.paymentId,
});

function attemptsOf(value: Prisma.JsonValue): ChargeAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(a => (a && typeof a === 'object' && !Array.isArray(a) && typeof a.on === 'string' && typeof a.ok === 'boolean' ? [{ on: a.on, ok: a.ok, reason: typeof a.reason === 'string' ? a.reason : null }] : []));
}

export const toCharge = (c: Row.Charge): ChargeRecord => ({
  id: c.id,
  memberId: c.memberId,
  packageId: c.packageId,
  amountSatang: c.amountSatang,
  dueOn: dayOf(c.dueOn),
  attempts: attemptsOf(c.attempts),
  status: c.status,
  paymentId: c.paymentId,
});

export const toFollowUp = (f: Row.FollowUp): FollowUpRecord => ({ memberId: f.memberId, stage: f.stage, note: f.note, by: f.by, updatedAt: f.updatedAt.toISOString() });

export const toHealthProfile = (h: Row.HealthProfile): HealthProfileRecord => ({
  userId: h.userId,
  sex: h.sex,
  birthYear: h.birthYear,
  heightCm: h.heightCm,
  weightKg: h.weightKg,
  goal: h.goal,
  activity: h.activity,
  consentAt: h.consentAt.toISOString(),
  noticeVersion: h.noticeVersion,
  updatedAt: h.updatedAt.toISOString(),
});

export const jsonStrings = strings;

/* ---------- อ่านข้อมูลที่ใช้บ่อย ---------- */

/** แพ็กเกจทั้งหมด (ตารางเล็ก) เป็น Map ตาม id */
export async function packagesById(db: Tx | PrismaClient = prisma()): Promise<Map<string, PackageRecord>> {
  const rows = await db.package.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return new Map(rows.map(r => [r.id, toPackage(r)]));
}

/** ชื่อเล่นเทรนเนอร์ตาม id */
export async function trainerNicknames(db: Tx | PrismaClient = prisma()): Promise<Map<string, string>> {
  const rows = await db.trainer.findMany({ select: { id: true, nickname: true } });
  return new Map(rows.map(r => [r.id, r.nickname]));
}
