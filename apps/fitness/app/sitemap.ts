import type { MetadataRoute } from 'next';
import { siteUrl } from '@/api/services/landing/landing/landing.seo';

/** /sitemap.xml — หน้าสาธารณะมีหน้าแรกหน้าเดียว (หน้าอื่นต้องเข้าสู่ระบบ) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, changeFrequency: 'weekly', priority: 1 }];
}
