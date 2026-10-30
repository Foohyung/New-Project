import 'server-only';
import { prisma } from '@/api/lib/db/db/db';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import type { BranchBrandingDto } from '@/api/types/branding/branding/branding.types';
import { isSafeLogoUrl } from '@/api/services/branding/branding/branding.service';

export async function getBranchBranding(session: Session): Promise<BranchBrandingDto> {
  await authorize(session, 'branding.view');
  const row = await prisma().branchBranding.findUnique({ where: { branch: session.branch } });
  return {
    branch: session.branch,
    gymName: row?.gymName ?? null,
    primaryColor: row?.primaryColor && /^#[\da-fA-F]{6}$/.test(row.primaryColor) ? row.primaryColor : null,
    logoUrl: row?.logoUrl && isSafeLogoUrl(row.logoUrl) ? row.logoUrl : null,
    hasUploadedLogo: Boolean(row?.logoData),
  };
}

export async function getBranchLogo(session: Session): Promise<{ data: string; contentType: string } | null> {
  await authorize(session, 'branding.view');
  const row = await prisma().branchBranding.findUnique({
    where: { branch: session.branch },
    select: { logoData: true, logoContentType: true },
  });
  if (!row?.logoData || !row.logoContentType) return null;
  return { data: row.logoData, contentType: row.logoContentType };
}

export async function updateBranchBranding(
  session: Session,
  input: { gymName: string | null; primaryColor: string; logo?: { data: string; contentType: string } | null; logoUrl?: string },
): Promise<void> {
  await authorize(session, 'branding.manage');
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
    where: { branch: session.branch },
    create: {
      branch: session.branch,
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
