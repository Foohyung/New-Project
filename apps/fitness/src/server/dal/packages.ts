import 'server-only';
import type { Session } from '../auth';
import { db, type PackageRecord } from '../db';
import { authorize, can, ForbiddenError } from '../rbac';

export interface PackageDto {
  id: string;
  name: string;
  kind: PackageRecord['kind'];
  priceSatang: number;
  description: string;
  active: boolean;
  durationLabel: string;
}

function durationLabel(p: PackageRecord): string {
  if (p.kind === 'pt') return `${String(p.sessions ?? 0)} ครั้ง`;
  if (p.kind === 'daypass') return `${String(p.days ?? 1)} วัน`;
  return `${String(p.months ?? 1)} เดือน`;
}

const toDto = (p: PackageRecord): PackageDto => ({ id: p.id, name: p.name, kind: p.kind, priceSatang: p.priceSatang, description: p.description, active: p.active, durationLabel: durationLabel(p) });

/** ราคาแพ็กเกจเป็นข้อมูล Public (§11.1) แต่ระบบนี้ให้ดูได้เฉพาะผู้ที่ login แล้ว */
export function listPackages(session: Session, options: { activeOnly?: boolean } = {}): Promise<PackageDto[]> {
  if (!can(session, 'members.view') && !can(session, 'portal.use')) return Promise.reject(new ForbiddenError());
  return Promise.resolve(db().packages.filter(p => !options.activeOnly || p.active).map(toDto));
}

export async function updatePackage(session: Session, id: string, input: { priceSatang: number; description: string; active: boolean }): Promise<PackageDto> {
  await authorize(session, 'packages.manage');
  const p = db().packages.find(x => x.id === id);
  if (!p) throw new Error('NOT_FOUND');
  Object.assign(p, input);
  return toDto(p);
}
