import { z } from 'zod';
import { isSafeLogoUrl } from '@/api/services/branding/branding/branding.service';

export const BrandingSchema = z.object({
  gymName: z.string().trim().max(120, 'ชื่อ Gym ยาวเกินไป').transform(value => value || null),
  primaryColor: z.string().regex(/^#[\da-fA-F]{6}$/, 'เลือกสีในรูปแบบ HEX'),
  logoUrl: z.string().trim().max(2048, 'URL โลโก้ยาวเกินไป').refine(isSafeLogoUrl, 'ใช้ URL HTTPS หรือพาธภายในเว็บเท่านั้น'),
});
