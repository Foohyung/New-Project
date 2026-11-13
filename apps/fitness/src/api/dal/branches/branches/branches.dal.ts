import 'server-only';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import { ForbiddenError, authorize } from '@/api/lib/auth/auth/auth.rbac';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma, transaction } from '@/api/lib/db/db/db';
import type { BranchInput } from '@/api/schemas/branches/branches/branches.schema';
import type { BranchDto } from '@/api/types/branches/branches/branches.types';

/** จัดการสาขาได้เฉพาะ role admin (สิทธิ์ branches.manage ให้ role อื่นไม่ได้ — ตรวจซ้ำที่นี่อีกชั้น) */
async function authorizeBranchManagement(session: Session): Promise<void> {
  await authorize(session, 'branches.manage');
  if (session.role !== 'admin') throw new ForbiddenError();
}

/** ลำดับสาขา: เพิ่มก่อนอยู่ก่อน (สาขาที่ย้ายเข้าตารางพร้อมกันตอน migrate เรียงตามชื่อ) */
const BRANCH_ORDER = [{ createdAt: 'asc' as const }, { name: 'asc' as const }];

const stamp = (session: Session) => ({ updatedById: session.userId, updatedByName: session.name });

function taken(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('BRANCH_TAKEN');
  throw error;
}

type BranchRow = { id: string; name: string; address: string | null; phone: string | null; active: boolean; updatedAt: Date; updatedByName: string | null };
const toDto = (b: BranchRow, userCount: number): BranchDto => ({
  id: b.id, name: b.name, address: b.address, phone: b.phone, active: b.active,
  userCount, updatedAt: b.updatedAt.toISOString(), updatedByName: b.updatedByName,
});

export async function listBranches(session: Session): Promise<BranchDto[]> {
  await authorizeBranchManagement(session);
  const db = prisma();
  const [rows, counts] = await Promise.all([
    // เรียงตามลำดับที่เพิ่ม — สาขาแรก (สาขาหลัก) อยู่บนสุด สาขาที่เพิ่มทีหลังต่อท้าย
    db.branch.findMany({ orderBy: BRANCH_ORDER }),
    db.user.groupBy({ by: ['branch'], _count: true }),
  ]);
  return rows.map(b => toDto(b, counts.find(c => c.branch === b.name)?._count ?? 0));
}

export async function getBranch(session: Session, id: string): Promise<BranchDto | null> {
  await authorizeBranchManagement(session);
  const row = await prisma().branch.findUnique({ where: { id } });
  return row ? toDto(row, await prisma().user.count({ where: { branch: row.name } })) : null;
}

/** ชื่อสาขาที่เปิดใช้งาน สำหรับช่องเลือกสาขาในฟอร์มบัญชีผู้ใช้ (เรียงตามลำดับที่เพิ่ม) */
export async function activeBranchNames(): Promise<string[]> {
  const rows = await prisma().branch.findMany({ where: { active: true }, select: { name: true }, orderBy: BRANCH_ORDER });
  return rows.map(r => r.name);
}

export async function createBranch(session: Session, input: BranchInput): Promise<void> {
  await authorizeBranchManagement(session);
  try {
    await prisma().branch.create({ data: { ...input, createdById: session.userId, createdByName: session.name, ...stamp(session) } });
  } catch (error) {
    taken(error);
  }
}

/** แก้ไขสาขา — เปลี่ยนชื่อแล้วอัปเดตทุกตารางที่อ้างชื่อสาขานี้ใน transaction เดียว · คืนค่าเดิมไว้บันทึก audit */
export async function updateBranch(session: Session, id: string, input: BranchInput & { active: boolean }): Promise<{ before: Omit<BranchDto, 'id' | 'userCount' | 'updatedAt' | 'updatedByName'> }> {
  await authorizeBranchManagement(session);
  try {
    return await transaction(session, async tx => {
      const before = await tx.branch.findUnique({ where: { id } });
      if (!before) throw new Error('NOT_FOUND');
      await tx.branch.update({ where: { id }, data: { ...input, ...stamp(session) } });
      if (before.name !== input.name) {
        await tx.user.updateMany({ where: { branch: before.name }, data: { branch: input.name } });
        await tx.ownerBranch.updateMany({ where: { branch: before.name }, data: { branch: input.name } });
        await tx.branchBranding.updateMany({ where: { branch: before.name }, data: { branch: input.name } });
      }
      return { before: { name: before.name, address: before.address, phone: before.phone, active: before.active } };
    });
  } catch (error) {
    return taken(error);
  }
}

/** ลบสาขา — มีบัญชีผู้ใช้หรือสินค้าอยู่ลบไม่ได้ (ให้ย้ายบัญชีหรือปิดใช้งานสาขาแทน) · ลบสาขาเพิ่มเติมของเจ้าของและแบรนด์ของสาขานั้นไปด้วย */
export async function deleteBranch(session: Session, id: string): Promise<{ name: string }> {
  await authorizeBranchManagement(session);
  return prisma().$transaction(async tx => {
    const branch = await tx.branch.findUnique({ where: { id } });
    if (!branch) throw new Error('NOT_FOUND');
    const [userCount, productCount] = await Promise.all([
      tx.user.count({ where: { branch: branch.name } }),
      tx.product.count({ where: { branch: branch.name } }),
    ]);
    if (userCount || productCount) throw new Error('BRANCH_IN_USE');
    await tx.ownerBranch.deleteMany({ where: { branch: branch.name } });
    await tx.branchBranding.deleteMany({ where: { branch: branch.name } });
    await tx.branch.delete({ where: { id } });
    return { name: branch.name };
  });
}
