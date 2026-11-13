import 'server-only';
import { prisma } from '@/api/lib/db/db/db';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { authorize, ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import type { BranchBrandingDto, BranchBrandingSummaryDto } from '@/api/types/branding/branding/branding.types';
import { isSafeLogoUrl } from '@/api/services/branding/branding/branding.service';

async function authorizeBranchScope(session: Session, branch: string): Promise<void> {
  if (session.role !== 'admin' && branch !== session.branch) throw new ForbiddenError();
  if (!await prisma().branch.findUnique({ where: { name: branch }, select: { name: true } })) throw new Error('NOT_FOUND');
}

function brandingDto(branch: string, row: {
  gymName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  logoData?: string | null;
  logoContentType?: string | null;
} | null): BranchBrandingDto {
  return {
    branch,
    gymName: row?.gymName ?? null,
    primaryColor: row?.primaryColor && /^#[\da-fA-F]{6}$/.test(row.primaryColor) ? row.primaryColor : null,
    logoUrl: row?.logoUrl && isSafeLogoUrl(row.logoUrl) ? row.logoUrl : null,
    hasUploadedLogo: Boolean(row?.logoData || row?.logoContentType),
  };
}

export async function listBranchBrandings(session: Session): Promise<BranchBrandingSummaryDto[]> {
  await authorize(session, 'branding.manage');
  if (session.role !== 'admin') throw new ForbiddenError();
  const db = prisma();
  const [branches, rows] = await Promise.all([
    db.branch.findMany({ select: { name: true, active: true }, orderBy: [{ createdAt: 'asc' }, { name: 'asc' }] }),
    db.branchBranding.findMany({ select: { branch: true, gymName: true, primaryColor: true, logoUrl: true, logoContentType: true } }),
  ]);
  const byBranch = new Map(rows.map(row => [row.branch, row]));
  return branches.map(branch => ({ ...brandingDto(branch.name, byBranch.get(branch.name) ?? null), active: branch.active }));
}

/** ใช้ทั้ง root layout (ทุกบทบาท รวมสมาชิก — ต้องเป็น branding.view) และหน้าแก้แบรนด์ (หน้าเช็ก branding.manage เองแล้ว) */
export async function getBranchBranding(session: Session, requestedBranch = session.branch): Promise<BranchBrandingDto> {
  await authorize(session, 'branding.view');
  await authorizeBranchScope(session, requestedBranch);
  const row = await prisma().branchBranding.findUnique({
    where: { branch: requestedBranch },
    select: { gymName: true, primaryColor: true, logoUrl: true, logoContentType: true },
  });
  return brandingDto(requestedBranch, row);
}

export async function getBranchLogo(session: Session, requestedBranch = session.branch): Promise<{ data: string; contentType: string } | null> {
  await authorize(session, 'branding.view');
  await authorizeBranchScope(session, requestedBranch);
  const row = await prisma().branchBranding.findUnique({
    where: { branch: requestedBranch },
    select: { logoData: true, logoContentType: true },
  });
  if (!row?.logoData || !row.logoContentType) return null;
  return { data: row.logoData, contentType: row.logoContentType };
}

export async function updateBranchBranding(
  session: Session,
  branch: string,
  input: { gymName: string | null; primaryColor: string | null; logo?: { data: string; contentType: string } | null; logoUrl?: string },
): Promise<void> {
  await authorize(session, 'branding.manage');
  await authorizeBranchScope(session, branch);
  const logoFields = input.logo
    ? { logoData: input.logo.data, logoContentType: input.logo.contentType, logoUrl: null }
    : input.logo === null
      ? { logoData: null, logoContentType: null, logoUrl: null }
      : input.logoUrl
        ? { logoData: null, logoContentType: null, logoUrl: input.logoUrl }
        : {};
  const author = {
    updatedById: session.userId,
    updatedByName: session.name,
  };
  await prisma().branchBranding.upsert({
    where: { branch },
    create: {
      branch,
      gymName: input.gymName,
      primaryColor: input.primaryColor,
      ...logoFields,
      createdById: session.userId,
      createdByName: session.name,
      ...author,
    },
    update: { gymName: input.gymName, primaryColor: input.primaryColor, ...logoFields, ...author },
  });
}
