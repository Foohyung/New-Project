import type { MetadataRoute } from 'next';
import { allHomeSlugs } from '@/server/dal/homes';
import { siteUrl } from '@/server/site';

/** sitemap.xml สร้างอัตโนมัติจากประกาศทั้งหมด (§16) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const slugs = await allHomeSlugs();
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...slugs.map(slug => ({ url: `${base}/homes/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
