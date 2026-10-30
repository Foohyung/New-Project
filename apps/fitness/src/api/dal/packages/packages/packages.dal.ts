import 'server-only';
import { packageDurationLabel } from '@/api/services/packages/packages/packages.service';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { packagesById, prismaAs, toPackage, type PackageRecord } from '@/api/lib/db/db/db';
import { authorize, can, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';

export interface PackageDto {
  id: string;
  name: string;
  kind: PackageRecord['kind'];
  priceSatang: number;
  description: string;
  active: boolean;
  durationLabel: string;
}

const toDto = (p: PackageRecord): PackageDto => ({ id: p.id, name: p.name, kind: p.kind, priceSatang: p.priceSatang, description: p.description, active: p.active, durationLabel: packageDurationLabel(p) });

/** ราคาแพ็กเกจเป็นข้อมูล Public (§11.1) แต่ระบบนี้ให้ดูได้เฉพาะผู้ที่ login แล้ว */
export async function listPackages(session: Session, options: { activeOnly?: boolean } = {}): Promise<PackageDto[]> {
  if (!can(session, 'members.view') && !can(session, 'portal.use')) throw new ForbiddenError();
  return [...(await packagesById()).values()].filter(p => !options.activeOnly || p.active).map(toDto);
}

export async function updatePackage(session: Session, id: string, input: { priceSatang: number; description: string; active: boolean }): Promise<PackageDto> {
  await authorize(session, 'packages.manage');
  const found = await prismaAs(session).package.findUnique({ where: { id } });
  if (!found) throw new Error('NOT_FOUND');
  return toDto(toPackage(await prismaAs(session).package.update({ where: { id }, data: input })));
}
