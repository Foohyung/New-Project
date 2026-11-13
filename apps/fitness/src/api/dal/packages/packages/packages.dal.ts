import 'server-only';
import { randomUUID } from 'node:crypto';
import { comparePackageDuration, packageDurationLabel } from '@/api/services/packages/packages/packages.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { packagesById, prisma, prismaAs, toPackage, type PackageRecord } from '@/api/lib/db/db/db';
import { Prisma, type Package as PackageRow } from '@/api/lib/db/db/generated/prisma/client';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import type { PackageInput } from '@/api/schemas/packages/packages/packages.schema';
import type { ManagedPackageDto, PackageDto } from '@/api/types/packages/packages/packages.types';

export type { PackageDto } from '@/api/types/packages/packages/packages.types';

const durationOf = (p: PackageRecord): number => (p.kind === 'pt' ? p.sessions : p.kind === 'daypass' ? p.days : p.months) ?? 1;

const toDto = (p: PackageRecord): PackageDto => ({ id: p.id, name: p.name, kind: p.kind, duration: durationOf(p), priceSatang: p.priceSatang, description: p.description, active: p.active, durationLabel: packageDurationLabel(p) });

/** ระยะเก็บแยกคอลัมน์ตามประเภท — คอลัมน์ของประเภทอื่นเป็น null */
const durationColumns = (kind: PackageInput['kind'], duration: number) => ({
  months: kind === 'time' ? duration : null,
  days: kind === 'daypass' ? duration : null,
  sessions: kind === 'pt' ? duration : null,
});

/** ราคาแพ็กเกจเป็นข้อมูล Public (§11.1) แต่ระบบนี้ให้ดูได้เฉพาะผู้ที่ login แล้ว */
export async function listPackages(session: Session, options: { activeOnly?: boolean } = {}): Promise<PackageDto[]> {
  if (!can(session, 'members.view') && !can(session, 'portal.use')) throw new ForbiddenError();
  return [...(await packagesById()).values()]
    .filter(p => !options.activeOnly || p.active)
    .sort(comparePackageDuration)
    .map(toDto);
}

/** จำนวนแถวที่อ้างแพ็กเกจ (FK) — มีแล้วลบไม่ได้ */
async function usage(ids: string[]): Promise<Map<string, { members: number; total: number }>> {
  const db = prisma();
  const where = { packageId: { in: ids } };
  const [members, payments, charges] = await Promise.all([
    db.member.groupBy({ by: ['packageId'], where, _count: true }),
    db.payment.groupBy({ by: ['packageId'], where, _count: true }),
    db.charge.groupBy({ by: ['packageId'], where, _count: true }),
  ]);
  const count = (rows: { packageId: string; _count: number }[], id: string) => rows.find(r => r.packageId === id)?._count ?? 0;
  return new Map(ids.map(id => [id, { members: count(members, id), total: count(members, id) + count(payments, id) + count(charges, id) }]));
}

const toManaged = (row: PackageRow, used: { members: number; total: number } | undefined): ManagedPackageDto => ({
  ...toDto(toPackage(row)),
  memberCount: used?.members ?? 0,
  inUse: used?.total ?? 0,
  updatedAt: row.updatedAt.toISOString(),
  updatedByName: row.updatedByName,
});

/** หน้าจัดการแพ็กเกจ — เรียงตามจำนวนวันจากน้อยไปมาก (PT ซึ่งนับเป็นครั้งอยู่ท้ายสุด) */
export async function listManagedPackages(session: Session): Promise<ManagedPackageDto[]> {
  await authorize(session, 'packages.manage');
  const rows = await prisma().package.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  const used = await usage(rows.map(r => r.id));
  return rows
    .sort(comparePackageDuration)
    .map(r => toManaged(r, used.get(r.id)));
}

export async function createPackage(session: Session, input: PackageInput): Promise<PackageDto> {
  await authorize(session, 'packages.manage');
  const db = prismaAs(session);
  const last = await db.package.aggregate({ _max: { sortOrder: true } });
  const row = await db.package.create({
    data: {
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      ...durationColumns(input.kind, input.duration),
      priceSatang: input.price,
      description: input.description,
      active: input.active,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
  return toDto(toPackage(row));
}

/** แก้ไขแพ็กเกจ — ประเภทเปลี่ยนไม่ได้ · ราคา/ระยะใหม่ใช้กับการสมัครหรือต่ออายุครั้งถัดไป · คืนค่าเดิมไว้บันทึก audit */
export async function updatePackage(session: Session, id: string, input: PackageInput): Promise<{ before: PackageDto; after: PackageDto }> {
  await authorize(session, 'packages.manage');
  const db = prismaAs(session);
  const found = await db.package.findUnique({ where: { id } });
  if (!found) throw new Error('NOT_FOUND');
  const row = await db.package.update({
    where: { id },
    data: { name: input.name, ...durationColumns(found.kind, input.duration), priceSatang: input.price, description: input.description, active: input.active },
  });
  return { before: toDto(toPackage(found)), after: toDto(toPackage(row)) };
}

/** ลบแพ็กเกจ — มีสมาชิก รายการชำระ หรือค่าใช้จ่ายอ้างอยู่ลบไม่ได้ (ให้ปิดขายแทน ประวัติจะได้ไม่หาย) */
export async function deletePackage(session: Session, id: string): Promise<PackageDto> {
  await authorize(session, 'packages.manage');
  const found = await prisma().package.findUnique({ where: { id } });
  if (!found) throw new Error('NOT_FOUND');
  if ((await usage([id])).get(id)?.total) throw new Error('PACKAGE_IN_USE');
  try {
    await prisma().package.delete({ where: { id } });
  } catch (error) {
    // มีรายการใหม่อ้างแพ็กเกจนี้ระหว่างตรวจกับลบ
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) throw new Error('PACKAGE_IN_USE');
    throw error;
  }
  return toDto(toPackage(found));
}
