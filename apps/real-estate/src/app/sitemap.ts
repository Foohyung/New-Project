import type { MetadataRoute } from 'next';
import { PROPERTY_TYPES } from '@/features/homes/catalog';
import { searchHref } from '@/features/homes/service';
import { allHomeSlugs } from '@/server/dal/homes';
import { siteUrl } from '@/server/site';

/** sitemap.xml สร้างอัตโนมัติจากประกาศทั้งหมด + หน้าค้นหาตามประเภท (§16) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const slugs = await allHomeSlugs();
  const searches = (['sale', 'rent'] as const).flatMap(deal => [searchHref({ deal }), ...PROPERTY_TYPES.map(t => searchHref({ deal, type: t.id }))]);
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...searches.map(path => ({ url: `${base}${path}`, changeFrequency: 'daily' as const, priority: 0.6 })),
    ...slugs.map(slug => ({ url: `${base}/homes/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
