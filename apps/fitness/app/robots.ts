import type { MetadataRoute } from 'next';
import { AI_CRAWLERS, PRIVATE_PATHS, siteUrl } from '@/api/services/landing/landing/landing.seo';

/** /robots.txt — เปิดให้เก็บเฉพาะหน้าสาธารณะ ทั้ง search engine และ AI crawler (SEO + GEO) */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: ['/', '/llms.txt'], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
