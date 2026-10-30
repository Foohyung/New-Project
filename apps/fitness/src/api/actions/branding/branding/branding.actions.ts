'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { updateBranchBranding } from '@/api/dal/branding/branding/branding.dal';
import { BrandingSchema } from '@/api/schemas/branding/branding/branding.schema';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function detectedImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function saveBranchBrandingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = BrandingSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const rawFile = formData.get('logoFile');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
  let logo: { data: string; contentType: string } | null | undefined;

  if (file) {
    if (file.size > MAX_LOGO_BYTES) return { ok: false, message: 'ไฟล์โลโก้ต้องมีขนาดไม่เกิน 5 MB', fieldErrors: { logoFile: 'ไฟล์มีขนาดใหญ่เกินไป' } };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = detectedImageType(bytes);
    if (!contentType || !IMAGE_TYPES.has(file.type) || file.type !== contentType) {
      return { ok: false, message: 'รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP ที่ถูกต้อง', fieldErrors: { logoFile: 'ชนิดไฟล์ไม่รองรับ' } };
    }
    logo = { data: Buffer.from(bytes).toString('base64'), contentType };
  } else if (formData.get('clearLogo') === 'on') {
    logo = null;
  }

  try {
    await updateBranchBranding(session, {
      gymName: parsed.data.gymName,
      primaryColor: parsed.data.primaryColor.toLowerCase(),
      ...(logo !== undefined ? { logo } : parsed.data.logoUrl ? { logoUrl: parsed.data.logoUrl } : {}),
    });
    await audit(session, 'branch.branding.update', 'branch', session.branch, {
      after: {
        branch: session.branch,
        gymName: parsed.data.gymName,
        primaryColor: parsed.data.primaryColor.toLowerCase(),
        logo: logo === null ? null : logo ? 'uploaded' : parsed.data.logoUrl || 'unchanged',
      },
    });
    revalidatePath('/', 'layout');
    revalidatePath('/branding');
    return { ok: true, message: 'บันทึกชื่อ Gym สี และโลโก้ของสาขาแล้ว' };
  } catch (error) {
    return knownFailure(error);
  }
}
