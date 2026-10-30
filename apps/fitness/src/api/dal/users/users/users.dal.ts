import 'server-only';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import { asDayOrNull, dayOrNull, prisma } from '@/api/lib/db/db/db';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { hashPassword } from '@/api/lib/auth/auth/auth.accounts';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import { normalizeIdentifier } from '@/api/services/auth/auth/auth.service';
import type { ManagedUser, UserOptions } from '@/api/types/users/users/users.types';

/**
 * ขอบเขตการจัดการบัญชี: admin เห็น/เพิ่มได้ทุกสาขา · บทบาทอื่นที่มี users.manage (เช่น เจ้าของ) เฉพาะสาขาที่ตัวเองดูแล
 * (สาขาหลัก users.branch + สาขาเพิ่มเติมใน owner_branches) · ตรวจที่ DAL เสมอ — ฟอร์มเป็นแค่ UX (§10.2)
 */
const isAdmin = (session: Session) => session.role === 'admin';

/** สาขาทั้งหมดของบัญชีหนึ่ง — สาขาหลักขึ้นก่อน ตามด้วยสาขาเพิ่มเติมเรียงตามชื่อ */
async function branchesOfUser(userId: string, homeBranch: string): Promise<string[]> {
  const extra = await prisma().ownerBranch.findMany({ where: { ownerId: userId }, select: { branch: true }, orderBy: { branch: 'asc' } });
  return [homeBranch, ...extra.map(e => e.branch).filter(b => b !== homeBranch)];
}

/** สาขาที่ session จัดการได้ — admin = null (ทุกสาขา) */
export async function managedBranches(session: Session): Promise<string[] | null> {
  return isAdmin(session) ? null : branchesOfUser(session.userId, session.branch);
}

/** บัญชีระดับบนที่ admin เห็นในหน้า /users — พนักงานอื่นดูผ่านหน้าเจ้าของแต่ละคน (getOwnerDetail) */
const ADMIN_LIST_ROLES = ['admin', 'owner'];

/** admin เห็นเฉพาะบัญชี admin และเจ้าของ · บทบาทอื่นเห็นเฉพาะพนักงานในสาขาที่ดูแล (เลือกทีละสาขาได้) และไม่เห็นบัญชี admin */
export async function listManagedUsers(session: Session, filter: { branch?: string } = {}): Promise<ManagedUser[]> {
  await authorize(session, 'users.manage');
  const mine = await managedBranches(session);
  const where: Prisma.UserWhereInput = mine === null
    ? { role: { in: ADMIN_LIST_ROLES } }
    : { branch: filter.branch && mine.includes(filter.branch) ? filter.branch : { in: mine }, role: { not: 'admin' } };
  const rows = await prisma().user.findMany({
    where,
    include: { roleDefinition: { select: { name: true } } },
    orderBy: mine === null ? [{ role: 'asc' }, { name: 'asc' }] : [{ branch: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toManagedUser);
}

function toManagedUser(row: Prisma.UserGetPayload<{ include: { roleDefinition: { select: { name: true } } } }>): ManagedUser {
  return {
    id: row.id, login: row.login, name: row.name, nickname: row.nickname,
    role: row.role, roleName: row.roleDefinition.name, branch: row.branch, active: row.active,
    activeFrom: dayOrNull(row.activeFrom), activeTo: dayOrNull(row.activeTo),
    trainerId: row.trainerId, memberId: row.memberId,
  };
}

export interface BranchSummary {
  branch: string;
  /** ชื่อเจ้าของสาขา (role owner — ทั้งสาขาหลักและสาขาเพิ่มเติม) */
  owners: string[];
  userCount: number;
}

/** สาขาพร้อมเจ้าของและจำนวนบัญชี — admin เห็นทุกสาขา · บทบาทอื่นเห็นเฉพาะสาขาที่ดูแล */
export async function listBranches(session: Session): Promise<BranchSummary[]> {
  await authorize(session, 'users.manage');
  const mine = await managedBranches(session);
  const db = prisma();
  const scope = mine === null ? {} : { branch: { in: mine } };
  const [counts, owners, extras] = await Promise.all([
    db.user.groupBy({ by: ['branch'], where: { ...scope, ...(mine === null ? {} : { role: { not: 'admin' } }) }, _count: true }),
    db.user.findMany({ where: { role: 'owner' }, select: { branch: true, name: true }, orderBy: { name: 'asc' } }),
    db.ownerBranch.findMany({ where: scope, select: { branch: true, owner: { select: { name: true, role: true } } } }),
  ]);
  const names = new Set<string>([...counts.map(c => c.branch), ...extras.map(e => e.branch), ...(mine ?? [])]);
  return [...names].sort((a, b) => a.localeCompare(b, 'th')).map(branch => ({
    branch,
    owners: [...new Set([
      ...owners.filter(o => o.branch === branch).map(o => o.name),
      ...extras.filter(e => e.branch === branch && e.owner.role === 'owner').map(e => e.owner.name),
    ])],
    userCount: counts.find(c => c.branch === branch)?._count ?? 0,
  }));
}

export interface OwnerSummary {
  branches: string[];
  /** จำนวนพนักงานในทุกสาขาที่ดูแล (ไม่นับตัวเจ้าของและ admin) */
  staffCount: number;
}

/** (admin) สรุปสาขาและจำนวนพนักงานของเจ้าของทุกคน — key = id ของเจ้าของ */
export async function listOwnerSummaries(session: Session): Promise<Record<string, OwnerSummary>> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) return {};
  const db = prisma();
  const [owners, extras, counts] = await Promise.all([
    db.user.findMany({ where: { role: 'owner' }, select: { id: true, branch: true } }),
    db.ownerBranch.findMany({ select: { ownerId: true, branch: true }, orderBy: { branch: 'asc' } }),
    db.user.groupBy({ by: ['branch'], where: { role: { notIn: ADMIN_LIST_ROLES } }, _count: true }),
  ]);
  const staffIn = (branch: string) => counts.find(c => c.branch === branch)?._count ?? 0;
  return Object.fromEntries(owners.map(o => {
    const branches = [o.branch, ...extras.filter(e => e.ownerId === o.id && e.branch !== o.branch).map(e => e.branch)];
    return [o.id, { branches, staffCount: branches.reduce((sum, b) => sum + staffIn(b), 0) }];
  }));
}

export interface OwnerDetail {
  owner: ManagedUser;
  branches: { branch: string; home: boolean; staff: ManagedUser[] }[];
}

/** (admin) เจ้าของคนหนึ่งดูแลสาขาไหนบ้าง และแต่ละสาขามีพนักงานคนไหน */
export async function getOwnerDetail(session: Session, ownerId: string): Promise<OwnerDetail | null> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  const db = prisma();
  const row = await db.user.findUnique({ where: { id: ownerId }, include: { roleDefinition: { select: { name: true } } } });
  if (!row || row.role !== 'owner') return null;
  const branches = await branchesOfUser(row.id, row.branch);
  const staff = await db.user.findMany({
    where: { branch: { in: branches }, id: { not: row.id }, role: { not: 'admin' } },
    include: { roleDefinition: { select: { name: true } } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  return {
    owner: toManagedUser(row),
    branches: branches.map(branch => ({ branch, home: branch === row.branch, staff: staff.filter(u => u.branch === branch).map(toManagedUser) })),
  };
}

/** (admin) เพิ่มสาขาให้เจ้าของดูแล */
export async function addOwnerBranch(session: Session, ownerId: string, branch: string): Promise<void> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  const db = prisma();
  const owner = await db.user.findUnique({ where: { id: ownerId }, select: { role: true, branch: true } });
  if (owner?.role !== 'owner') throw new Error('NOT_FOUND');
  if (owner.branch === branch) throw new Error('OWNER_BRANCH_TAKEN');
  try {
    await db.ownerBranch.create({ data: { ownerId, branch, createdById: session.userId, createdByName: session.name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('OWNER_BRANCH_TAKEN');
    throw error;
  }
}

/** (admin) เอาสาขาเพิ่มเติมออกจากเจ้าของ — สาขาหลักเอาออกไม่ได้ (ไม่มีแถวใน owner_branches) */
export async function removeOwnerBranch(session: Session, ownerId: string, branch: string): Promise<void> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  const { count } = await prisma().ownerBranch.deleteMany({ where: { ownerId, branch } });
  if (count === 0) throw new Error('NOT_FOUND');
}

/** ตัวเลือกในฟอร์มบัญชี — forUserId = หน้าแก้ไข: รวมเทรนเนอร์/สมาชิกที่บัญชีนั้นผูกอยู่ด้วย */
export async function listUserOptions(session: Session, forUserId?: string): Promise<UserOptions> {
  await authorize(session, 'users.manage');
  const db = prisma();
  const [trainers, members, roles] = await Promise.all([
    db.trainer.findMany({ where: { OR: [{ users: { none: {} } }, ...(forUserId ? [{ users: { some: { id: forUserId } } }] : [])] }, select: { id: true, nickname: true }, orderBy: { nickname: 'asc' } }),
    db.member.findMany({ where: { OR: [{ user: null }, ...(forUserId ? [{ user: { id: forUserId } }] : [])] }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
    // ให้สิทธิ์ admin ได้เฉพาะ admin (กันเจ้าของสาขายกระดับสิทธิ์ให้คนอื่นเกินตัวเอง)
    db.roleDefinition.findMany({ where: isAdmin(session) ? {} : { id: { not: 'admin' } }, select: { id: true, name: true, system: true }, orderBy: [{ system: 'desc' }, { name: 'asc' }] }),
  ]);
  return { trainers, members, roles };
}

export async function createManagedUser(
  session: Session,
  input: UserInput & { password: string },
): Promise<ManagedUser> {
  await authorize(session, 'users.manage');
  const login = normalizeIdentifier(input.login);
  // เจ้าของเพิ่มได้เฉพาะสาขาที่ตัวเองดูแล — สาขาอื่นจากฟอร์มถูกแทนด้วยสาขาหลัก
  const mine = await managedBranches(session);
  const branch = mine === null || mine.includes(input.branch) ? input.branch : session.branch;
  if (!isAdmin(session) && input.role === 'admin') throw new Error('INVALID_USER_ROLE');
  try {
    const role = await checkedRole(input);
    const row = await prisma().user.create({
      data: {
        login,
        passwordHash: hashPassword(input.password),
        mustChangePassword: true,
        role: role.id,
        name: input.name,
        nickname: input.nickname,
        branch,
        trainerId: role.id === 'trainer' ? input.trainerId : null,
        memberId: role.id === 'member' ? input.memberId : null,
        activeFrom: asDayOrNull(input.activeFrom ?? null),
        activeTo: asDayOrNull(input.activeTo ?? null),
        createdById: session.userId,
        createdByName: session.name,
        updatedById: session.userId,
        updatedByName: session.name,
      },
      include: { roleDefinition: { select: { name: true } } },
    });
    return toManagedUser(row);
  } catch (error) {
    throw knownWriteError(error);
  }
}

interface UserInput {
  login: string; name: string; nickname: string; role: string; branch: string;
  trainerId?: string; memberId?: string; activeFrom?: string | null; activeTo?: string | null;
}

/** role ต้องมีอยู่จริง และการผูกโปรไฟล์เทรนเนอร์/สมาชิกต้องตรงกับ role */
async function checkedRole(input: Pick<UserInput, 'role' | 'trainerId' | 'memberId'>): Promise<{ id: string; name: string }> {
  const role = await prisma().roleDefinition.findUnique({ where: { id: input.role }, select: { id: true, name: true } });
  if (!role || (role.id === 'trainer' && !input.trainerId) || (role.id === 'member' && !input.memberId) || (!['trainer', 'member'].includes(role.id) && (input.trainerId || input.memberId))) {
    throw new Error('INVALID_USER_ROLE');
  }
  return role;
}

function knownWriteError(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return new Error('USER_LOGIN_TAKEN');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return new Error('INVALID_USER_ROLE');
  return error;
}

/** (admin) บัญชีหนึ่งสำหรับหน้าแก้ไข */
export async function getManagedUser(session: Session, id: string): Promise<ManagedUser | null> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  const row = await prisma().user.findUnique({ where: { id }, include: { roleDefinition: { select: { name: true } } } });
  return row ? toManagedUser(row) : null;
}

/**
 * (admin) แก้ไขบัญชี — password ว่าง = ใช้รหัสเดิม
 * กันล็อกตัวเองออก: admin เปลี่ยน role ตัวเอง ปิดใช้งานตัวเอง หรือตั้งช่วงวันที่ให้ตัวเองไม่ได้
 */
export async function updateManagedUser(
  session: Session,
  id: string,
  input: UserInput & { password: string; active: boolean },
): Promise<{ before: ManagedUser; after: ManagedUser }> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  const db = prisma();
  const current = await db.user.findUnique({ where: { id }, include: { roleDefinition: { select: { name: true } } } });
  if (!current) throw new Error('NOT_FOUND');
  if (id === session.userId && (input.role !== current.role || !input.active || input.activeFrom || input.activeTo)) throw new Error('USER_SELF_LOCKOUT');
  const role = await checkedRole(input);
  try {
    const row = await db.user.update({
      where: { id },
      data: {
        login: normalizeIdentifier(input.login),
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
        role: role.id,
        name: input.name,
        nickname: input.nickname,
        branch: input.branch,
        trainerId: role.id === 'trainer' ? input.trainerId : null,
        memberId: role.id === 'member' ? input.memberId : null,
        active: input.active,
        activeFrom: asDayOrNull(input.activeFrom ?? null),
        activeTo: asDayOrNull(input.activeTo ?? null),
        updatedById: session.userId,
        updatedByName: session.name,
      },
      include: { roleDefinition: { select: { name: true } } },
    });
    // เปลี่ยนรหัสผ่านหรือปิดใช้งาน = ออกจากระบบทุกเครื่องทันที
    if (input.password || !input.active) await db.session.deleteMany({ where: { userId: id } });
    return { before: toManagedUser(current), after: toManagedUser(row) };
  } catch (error) {
    throw knownWriteError(error);
  }
}

/** (admin) ลบบัญชีถาวร — session และสาขาเพิ่มเติมของเจ้าของถูกลบตาม (cascade) · ลบบัญชีตัวเองไม่ได้ */
export async function deleteManagedUser(session: Session, id: string): Promise<ManagedUser> {
  await authorize(session, 'users.manage');
  if (!isAdmin(session)) throw new Error('FORBIDDEN');
  if (id === session.userId) throw new Error('USER_SELF_LOCKOUT');
  const db = prisma();
  const row = await db.user.findUnique({ where: { id }, include: { roleDefinition: { select: { name: true } } } });
  if (!row) throw new Error('NOT_FOUND');
  await db.user.delete({ where: { id } });
  return toManagedUser(row);
}

/* ---------- ลืมรหัสผ่าน: ผู้ใช้ส่งคำขอ → พนักงานรีเซ็ตเป็นรหัสชั่วคราว (บังคับเปลี่ยนตอนเข้าระบบครั้งถัดไป) ---------- */

export interface PasswordResetRequestDto {
  id: string;
  requestedAt: string;
  user: { id: string; name: string; login: string; roleName: string; branch: string };
}

/**
 * (สาธารณะ — ไม่ต้องเข้าสู่ระบบ) ส่งคำขอรีเซ็ตรหัสผ่าน
 * ไม่บอกผลว่าบัญชีมีจริงไหม (กันเดาบัญชี) · มีคำขอค้างอยู่แล้วไม่สร้างซ้ำ · ไม่รับคำขอของ admin (ให้ admin อีกคนแก้ที่หน้าแก้ไขบัญชี)
 */
export async function requestPasswordReset(identifier: string): Promise<void> {
  const db = prisma();
  const user = await db.user.findUnique({ where: { login: normalizeIdentifier(identifier) }, select: { id: true, role: true, active: true } });
  if (!user?.active || user.role === 'admin') return;
  const open = await db.passwordResetRequest.findFirst({ where: { userId: user.id, resolvedAt: null }, select: { id: true } });
  if (!open) await db.passwordResetRequest.create({ data: { userId: user.id } });
}

/** คำขอที่ยังค้าง ตามขอบเขตบัญชีที่ session จัดการได้ (admin ทุกสาขา · เจ้าของเฉพาะสาขาที่ดูแล) */
export async function listPasswordResetRequests(session: Session): Promise<PasswordResetRequestDto[]> {
  await authorize(session, 'users.manage');
  const mine = await managedBranches(session);
  const rows = await prisma().passwordResetRequest.findMany({
    where: { resolvedAt: null, user: mine === null ? {} : { branch: { in: mine }, role: { not: 'admin' } } },
    include: { user: { include: { roleDefinition: { select: { name: true } } } } },
    orderBy: { requestedAt: 'asc' },
  });
  return rows.map(r => ({
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    user: { id: r.user.id, name: r.user.name, login: r.user.login, roleName: r.user.roleDefinition.name, branch: r.user.branch },
  }));
}

/** รีเซ็ตเป็นรหัสชั่วคราว (บังคับเปลี่ยนรหัสตอนเข้าระบบ + ออกจากระบบทุกเครื่อง) หรือปิดคำขอโดยไม่รีเซ็ต */
export async function resolvePasswordReset(session: Session, requestId: string, resolution: 'reset' | 'dismissed', tempPassword: string): Promise<{ userId: string; name: string }> {
  await authorize(session, 'users.manage');
  const mine = await managedBranches(session);
  const db = prisma();
  const request = await db.passwordResetRequest.findUnique({ where: { id: requestId }, include: { user: { select: { id: true, name: true, branch: true, role: true } } } });
  if (!request || request.resolvedAt) throw new Error('NOT_FOUND');
  if (mine !== null && (!mine.includes(request.user.branch) || request.user.role === 'admin')) throw new Error('FORBIDDEN');
  const resolved = { resolvedAt: new Date(), resolution, resolvedById: session.userId, resolvedByName: session.name };
  if (resolution === 'reset') {
    await db.$transaction([
      db.user.update({ where: { id: request.user.id }, data: { passwordHash: hashPassword(tempPassword), mustChangePassword: true, updatedById: session.userId, updatedByName: session.name } }),
      db.session.deleteMany({ where: { userId: request.user.id } }),
      // ปิดคำขออื่นที่ค้างของบัญชีเดียวกันไปด้วย
      db.passwordResetRequest.updateMany({ where: { userId: request.user.id, resolvedAt: null }, data: resolved }),
    ]);
  } else {
    await db.passwordResetRequest.update({ where: { id: requestId }, data: resolved });
  }
  return { userId: request.user.id, name: request.user.name };
}
