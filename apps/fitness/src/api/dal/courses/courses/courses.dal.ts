import 'server-only';
import { nextReceiptNo } from '@/api/dal/payments/payments/payments.receipt-no';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now, today } from '@/api/lib/clock/clock/clock';
import { asDay, dayOf, prisma, prismaAs, transaction, type Tx } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { canEnroll, SEAT_STATUSES } from '@/api/services/courses/courses/courses.service';
import type { CourseInput } from '@/api/schemas/courses/courses/courses.schema';
import type { CourseDto, EnrollmentDto, PortalCourseDto } from '@/api/types/courses/courses/courses.types';
import { assertPaymentMethodEnabled } from '@/api/dal/payments/payments/payments.dal';
import { resolvePurchaseCoupon } from '@/api/dal/coupons/coupons/coupons.dal';

const COURSE_INCLUDE = { trainer: { select: { name: true } } } as const;
type CourseRow = Prisma.CourseGetPayload<{ include: typeof COURSE_INCLUDE }>;
const ENROLLMENT_INCLUDE = { course: { select: { title: true } }, member: { select: { name: true, code: true, phone: true } } } as const;
const ENROLLMENT_QUERY = { include: ENROLLMENT_INCLUDE, omit: { slipData: true } } as const;
type EnrollmentRow = Prisma.CourseEnrollmentGetPayload<typeof ENROLLMENT_QUERY>;

/** นับการสมัครตามสถานะของหลายคอร์ส */
async function counts(db: Tx | ReturnType<typeof prisma>, ids: string[]) {
  const rows = await db.courseEnrollment.groupBy({ by: ['courseId', 'status'], where: { courseId: { in: ids } }, _count: true });
  const of = (id: string, statuses: readonly string[]) => rows.filter(r => r.courseId === id && statuses.includes(r.status)).reduce((s, r) => s + r._count, 0);
  return (id: string) => ({ taken: of(id, SEAT_STATUSES), paid: of(id, ['paid']), review: of(id, ['review']), any: of(id, ['pending', 'review', 'paid', 'cancelled']) });
}

const toCourse = (c: CourseRow, n: { taken: number; paid: number; review: number; any: number }): CourseDto => ({
  id: c.id, title: c.title, description: c.description, trainerId: c.trainerId, trainerName: c.trainer?.name ?? null, room: c.room, schedule: c.schedule,
  startsOn: dayOf(c.startsOn), endsOn: dayOf(c.endsOn), sessions: c.sessions, capacity: c.capacity, priceSatang: c.priceSatang, active: c.active,
  taken: n.taken, paid: n.paid, review: n.review, hasEnrollments: n.any > 0, updatedAt: c.updatedAt.toISOString(), updatedByName: c.updatedByName,
});

const toEnrollment = (e: EnrollmentRow): EnrollmentDto => ({
  id: e.id, receiptNo: e.receiptNo, courseId: e.courseId, courseTitle: e.course.title, memberId: e.memberId, memberName: e.member.name, memberCode: e.member.code,
  memberPhone: e.member.phone, status: e.status, method: e.method, amountSatang: e.amountSatang, createdAt: e.createdAt.toISOString(),
  paidAt: e.paidAt?.toISOString() ?? null, receivedBy: e.receivedBy,
  listPriceSatang: e.listPriceSatang, discountSatang: e.discountSatang, couponCode: e.couponCode,
  hasSlip: Boolean(e.slipContentType),
});

const courseData = (input: CourseInput) => ({
  title: input.title, description: input.description, trainerId: input.trainerId, room: input.room, schedule: input.schedule,
  startsOn: asDay(input.startsOn), endsOn: asDay(input.endsOn), sessions: input.sessions, capacity: input.capacity, priceSatang: input.price, active: input.active,
});

/** ดูผู้สมัครได้ทั้งผู้จัดการคอร์สและเจ้าหน้าที่ยืนยันการชำระ */
function canViewEnrollments(session: Session): boolean {
  return can(session, 'courses.manage') || can(session, 'payments.confirm');
}

/* ---------- เจ้าหน้าที่ ---------- */

/** คอร์สทั้งหมด เรียงตามวันเริ่ม (ล่าสุดก่อน) */
export async function listCourses(session: Session): Promise<CourseDto[]> {
  if (!canViewEnrollments(session)) throw new ForbiddenError();
  const db = prismaAs(session);
  const rows = await db.course.findMany({ include: COURSE_INCLUDE, orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }] });
  const n = await counts(db, rows.map(r => r.id));
  return rows.map(r => toCourse(r, n(r.id)));
}

export async function getCourse(session: Session, id: string): Promise<{ course: CourseDto; enrollments: EnrollmentDto[] } | null> {
  if (!canViewEnrollments(session)) throw new ForbiddenError();
  const db = prismaAs(session);
  const row = await db.course.findUnique({ where: { id }, include: COURSE_INCLUDE });
  if (!row) return null;
  const [n, enrollments] = await Promise.all([
    counts(db, [id]),
    db.courseEnrollment.findMany({ where: { courseId: id }, ...ENROLLMENT_QUERY, orderBy: { createdAt: 'asc' } }),
  ]);
  return { course: toCourse(row, n(id)), enrollments: enrollments.map(toEnrollment) };
}

/** รายการที่รอตรวจสลิปทุกคอร์ส (แสดงในหน้าคอร์ส) */
export async function listEnrollmentsToReview(session: Session): Promise<EnrollmentDto[]> {
  if (!canViewEnrollments(session)) throw new ForbiddenError();
  const rows = await prismaAs(session).courseEnrollment.findMany({ where: { status: 'review' }, ...ENROLLMENT_QUERY, orderBy: { updatedAt: 'asc' } });
  return rows.map(toEnrollment);
}

/** เทรนเนอร์สำหรับช่องเลือกผู้สอน */
export async function courseTrainerOptions(session: Session): Promise<{ id: string; name: string }[]> {
  await authorize(session, 'courses.manage');
  return prisma().trainer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

export async function createCourse(session: Session, input: CourseInput): Promise<CourseDto> {
  await authorize(session, 'courses.manage');
  const db = prismaAs(session);
  const row = await db.course.create({ data: courseData(input), include: COURSE_INCLUDE });
  return toCourse(row, { taken: 0, paid: 0, review: 0, any: 0 });
}

/** แก้ไขคอร์ส — ลดที่นั่งต่ำกว่าจำนวนที่สมัครแล้วไม่ได้ · คืนค่าเดิมไว้บันทึก audit */
export async function updateCourse(session: Session, id: string, input: CourseInput): Promise<{ before: CourseDto; after: CourseDto }> {
  await authorize(session, 'courses.manage');
  return transaction(session, async tx => {
    const found = await tx.course.findUnique({ where: { id }, include: COURSE_INCLUDE });
    if (!found) throw new Error('NOT_FOUND');
    const n = (await counts(tx, [id]))(id);
    if (input.capacity < n.taken) throw new Error(`COURSE_CAPACITY:${String(n.taken)}`);
    const row = await tx.course.update({ where: { id }, data: courseData(input), include: COURSE_INCLUDE });
    return { before: toCourse(found, n), after: toCourse(row, n) };
  });
}

/** ลบคอร์ส — เคยมีผู้สมัคร (รวมที่ยกเลิก) ลบไม่ได้ เพื่อเก็บประวัติการเงิน ให้ปิดรับสมัครแทน */
export async function deleteCourse(session: Session, id: string): Promise<{ title: string }> {
  await authorize(session, 'courses.manage');
  return transaction(session, async tx => {
    const found = await tx.course.findUnique({ where: { id } });
    if (!found) throw new Error('NOT_FOUND');
    if (await tx.courseEnrollment.count({ where: { courseId: id } })) throw new Error('COURSE_IN_USE');
    await tx.course.delete({ where: { id } });
    return { title: found.title };
  });
}

export async function confirmEnrollment(session: Session, id: string): Promise<EnrollmentDto> {
  await authorize(session, 'payments.confirm');
  return transaction(session, async tx => {
    const e = await tx.courseEnrollment.findUnique({ where: { id } });
    if (!e) throw new Error('NOT_FOUND');
    if (e.status === 'cancelled') throw new Error('ENROLLMENT_CANCELLED');
    if (e.status !== 'paid') await tx.courseEnrollment.update({ where: { id }, data: { status: 'paid', paidAt: now(), receivedBy: session.name } });
    return toEnrollment(await tx.courseEnrollment.findUniqueOrThrow({ where: { id }, ...ENROLLMENT_QUERY }));
  });
}

/* ---------- สมาชิก ---------- */

/** คอร์สที่เปิดรับสมัครและยังไม่จบ พร้อมสถานะการสมัครของตัวเอง */
export async function listOpenCourses(session: Session): Promise<PortalCourseDto[]> {
  await authorize(session, 'portal.use');
  const db = prismaAs(session);
  const rows = await db.course.findMany({ where: { active: true, endsOn: { gte: asDay(today()) } }, include: COURSE_INCLUDE, orderBy: [{ startsOn: 'asc' }, { title: 'asc' }] });
  const [n, mine] = await Promise.all([
    counts(db, rows.map(r => r.id)),
    session.memberId ? db.courseEnrollment.findMany({ where: { memberId: session.memberId, status: { not: 'cancelled' } }, select: { id: true, courseId: true, status: true } }) : [],
  ]);
  return rows.map(r => {
    const { paid: _paid, review: _review, hasEnrollments: _any, updatedAt: _u, updatedByName: _n, ...course } = toCourse(r, n(r.id));
    const my = mine.find(m => m.courseId === r.id);
    return { ...course, mine: my ? { id: my.id, status: my.status } : null };
  });
}

/** สมาชิกสมัครคอร์สเอง → รายการรอชำระ (PromptPay) · สมัครซ้ำได้รายการเดิม · ล็อกแถวคอร์สกันที่นั่งเกินเมื่อสมัครพร้อมกัน */
export async function enrollSelf(session: Session, courseId: string, couponCode: string | null = null): Promise<EnrollmentDto> {
  await authorize(session, 'portal.use');
  if (!session.memberId) throw new ForbiddenError();
  const memberId = session.memberId;
  return transaction(session, async tx => {
    await tx.$queryRaw`SELECT id FROM courses WHERE id = ${courseId} FOR UPDATE`;
    await assertPaymentMethodEnabled(tx, session.branch, 'promptpay');
    const course = await tx.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error('NOT_FOUND');
    const existing = await tx.courseEnrollment.findUnique({ where: { courseId_memberId: { courseId, memberId } }, ...ENROLLMENT_QUERY });
    if (existing && existing.status !== 'cancelled') return toEnrollment(existing);
    if (!canEnroll({ active: course.active, endsOn: dayOf(course.endsOn) }, today())) throw new Error('COURSE_CLOSED');
    const taken = await tx.courseEnrollment.count({ where: { courseId, status: { in: [...SEAT_STATUSES] } } });
    if (taken >= course.capacity) throw new Error('COURSE_FULL');
    const coupon = couponCode
      ? await resolvePurchaseCoupon(tx, couponCode, { target: 'course', priceSatang: course.priceSatang, memberId, selfService: true })
      : null;
    const amountSatang = course.priceSatang - (coupon?.discountSatang ?? 0);
    const paidInFullByCoupon = amountSatang === 0;
    const data = {
      receiptNo: await nextReceiptNo(tx, session.branch),
      status: paidInFullByCoupon ? 'paid' as const : 'pending' as const,
      method: 'promptpay' as const,
      amountSatang,
      listPriceSatang: course.priceSatang,
      discountSatang: coupon?.discountSatang ?? 0,
      couponCode: coupon?.code ?? null,
      paidAt: paidInFullByCoupon ? now() : null,
      receivedBy: paidInFullByCoupon ? 'คูปองเต็มจำนวน' : null,
    };
    // เคยสมัครแล้วยกเลิก → ใช้แถวเดิม (1 คน 1 แถวต่อคอร์ส) ด้วยเลขใบเสร็จใหม่
    const row = existing
      ? await tx.courseEnrollment.update({ where: { id: existing.id }, data: { ...data, createdAt: now() }, ...ENROLLMENT_QUERY })
      : await tx.courseEnrollment.create({ data: { ...data, courseId, memberId }, ...ENROLLMENT_QUERY });
    if (coupon) await tx.coupon.update({ where: { code: coupon.code }, data: { used: { increment: 1 } } });
    return toEnrollment(row);
  });
}

/** สมาชิกดูได้เฉพาะของตัวเอง เจ้าหน้าที่ดูได้ทุกรายการ (กัน IDOR) */
export async function getEnrollment(session: Session, id: string): Promise<EnrollmentDto | null> {
  const row = await prismaAs(session).courseEnrollment.findUnique({ where: { id }, ...ENROLLMENT_QUERY });
  const allowed = row && (canViewEnrollments(session) || (can(session, 'portal.use') && session.memberId === row.memberId));
  return row && allowed ? toEnrollment(row) : null;
}

export async function getEnrollmentReceipt(session: Session, id: string): Promise<{ enrollment: EnrollmentDto; branch: string } | null> {
  const db = prismaAs(session);
  const row = await db.courseEnrollment.findUnique({ where: { id }, ...ENROLLMENT_QUERY });
  const allowed = row && (canViewEnrollments(session) || (can(session, 'portal.use') && session.memberId === row.memberId));
  if (!row || !allowed) return null;
  const creator = row.createdById
    ? await db.user.findUnique({ where: { id: row.createdById }, select: { branch: true } })
    : null;
  return { enrollment: toEnrollment(row), branch: creator?.branch ?? session.branch };
}

/** สมาชิกแจ้งว่าโอนแล้ว → รอเจ้าหน้าที่ตรวจ */
export async function submitEnrollmentSlip(session: Session, id: string, slip?: { data: string; contentType: string }): Promise<EnrollmentDto> {
  const db = prismaAs(session);
  const e = await db.courseEnrollment.findUnique({ where: { id } });
  if (!e) throw new Error('NOT_FOUND');
  const own = can(session, 'portal.use') && session.memberId === e.memberId;
  if (!own && !can(session, 'payments.collect')) throw new ForbiddenError();
  if (own && !slip) throw new Error('SLIP_REQUIRED');
  if (e.status === 'pending') {
    await db.courseEnrollment.update({ where: { id }, data: { status: 'review', ...(slip ? { slipData: slip.data, slipContentType: slip.contentType } : {}) } });
  }
  return toEnrollment(await db.courseEnrollment.findUniqueOrThrow({ where: { id }, ...ENROLLMENT_QUERY }));
}

export async function getEnrollmentSlip(session: Session, id: string): Promise<{ data: string; contentType: string } | null> {
  const row = await prismaAs(session).courseEnrollment.findUnique({
    where: { id },
    select: { memberId: true, slipData: true, slipContentType: true },
  });
  if (!row) return null;
  const own = can(session, 'portal.use') && session.memberId === row.memberId;
  if (!own && !canViewEnrollments(session)) throw new ForbiddenError();
  return row.slipData && row.slipContentType ? { data: row.slipData, contentType: row.slipContentType } : null;
}

/** ยกเลิกการสมัคร (คืนที่นั่ง) — สมาชิกยกเลิกเองได้ก่อนชำระ · ชำระแล้วต้องให้ผู้จัดการคอร์สยกเลิก (คืนเงินนอกระบบ) */
export async function cancelEnrollment(session: Session, id: string): Promise<EnrollmentDto> {
  const db = prismaAs(session);
  const e = await db.courseEnrollment.findUnique({ where: { id } });
  if (!e) throw new Error('NOT_FOUND');
  const own = can(session, 'portal.use') && session.memberId === e.memberId;
  if (!can(session, 'courses.manage') && !(own && e.status !== 'paid')) throw new ForbiddenError();
  if (e.status !== 'cancelled') {
    await db.courseEnrollment.update({ where: { id }, data: { status: 'cancelled' } });
    if (e.couponCode && (e.status !== 'paid' || e.amountSatang === 0)) {
      await db.coupon.updateMany({ where: { code: e.couponCode, used: { gt: 0 } }, data: { used: { decrement: 1 } } });
    }
  }
  return toEnrollment(await db.courseEnrollment.findUniqueOrThrow({ where: { id }, ...ENROLLMENT_QUERY }));
}
