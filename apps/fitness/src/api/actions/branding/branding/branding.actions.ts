'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { updateBranchBranding } from '@/api/dal/branding/branding/branding.dal';
import { BrandingSchema } from '@/api/schemas/branding/branding/branding.schema';
import { detectedImageType, IMAGE_TYPES } from '@/api/services/shared/shared/shared.image';
import { formObject, knownFailure, validationFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function saveBranchBrandingAction(branch: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const targetBranch = branch.trim();
  if (!targetBranch) return { ok: false, message: 'ไม่พบสาขาที่ต้องการแก้ไข กรุณากลับไปเลือกสาขาใหม่' };
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
    await updateBranchBranding(session, targetBranch, {
      gymName: parsed.data.gymName,
      primaryColor: parsed.data.primaryColor,
      ...(logo !== undefined ? { logo } : parsed.data.logoUrl ? { logoUrl: parsed.data.logoUrl } : {}),
    });
    await audit(session, 'branch.branding.update', 'branch', targetBranch, {
      after: {
        branch: targetBranch,
        gymName: parsed.data.gymName,
        primaryColor: parsed.data.primaryColor ?? 'theme',
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
