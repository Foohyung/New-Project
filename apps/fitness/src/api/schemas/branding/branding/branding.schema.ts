import { z } from 'zod';
import { isSafeLogoUrl } from '@/api/services/branding/branding/branding.service';

export const BrandingSchema = z.object({
  gymName: z.string().trim().max(120, 'ชื่อ Gym ยาวเกินไป').transform(value => value || null),
  // ติ๊ก "ใช้สีตามธีม" = ไม่กำหนดสีแบรนด์ (null) ให้แต่ละคนเห็นสีตามธีมที่เลือกเอง
  useThemeColor: z.literal('on').optional(),
  primaryColor: z.string().regex(/^#[\da-fA-F]{6}$/, 'เลือกสีในรูปแบบ HEX').optional(),
  logoUrl: z.string().trim().max(2048, 'URL โลโก้ยาวเกินไป').refine(isSafeLogoUrl, 'ใช้ URL HTTPS หรือพาธภายในเว็บเท่านั้น'),
}).transform(({ useThemeColor, primaryColor, ...rest }, ctx) => {
  if (useThemeColor === 'on') return { ...rest, primaryColor: null };
  if (!primaryColor) {
    ctx.addIssue({ code: 'custom', path: ['primaryColor'], message: 'เลือกสี หรือติ๊ก "ใช้สีตามธีม"' });
    return z.NEVER;
  }
  return { ...rest, primaryColor: primaryColor.toLowerCase() };
});
