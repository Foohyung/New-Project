import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/api/lib/auth/auth/auth.session';
import { landingFor } from '@/api/services/auth/auth/auth.service';
import { chatUrl } from '@/api/services/landing/landing/landing.service';
import { jsonLdString, landingJsonLd, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, siteUrl } from '@/api/services/landing/landing/landing.seo';
import { LandingPage } from '@/web/components/landing/landing/landing';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** หน้าแรกสาธารณะให้ค้นหาเจอ แต่แดชบอร์ดหลังเข้าสู่ระบบต้องไม่ถูก index */
export async function generateMetadata(): Promise<Metadata> {
  if (await getSession()) return { title: 'แดชบอร์ด', robots: { index: false, follow: false } };
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: { absolute: SITE_TITLE },
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    applicationName: SITE_NAME,
    alternates: { canonical: '/', types: { 'text/markdown': '/llms.txt' } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION, locale: 'th_TH' },
    twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  };
}

/**
 * `/` — ยังไม่เข้าสู่ระบบเห็นหน้าแรก (แบบ D)
 * เข้าสู่ระบบแล้วไปหน้าแรกตามตำแหน่ง
 */
export default async function HomePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    return (
      <>
        {/* schema.org สำหรับ rich result / AI answer (ไม่ใช่สคริปต์ที่รัน จึงไม่ต้องใช้ CSP nonce) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(landingJsonLd(siteUrl())) }} />
        <LandingPage chatUrl={chatUrl(process.env.LANDING_CHAT_URL)} />
      </>
    );
  }
  const target = landingFor(session.role);
  if (target === '/dashboard') {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) value.forEach(item => { query.append(key, item); });
      else if (typeof value === 'string') query.set(key, value);
    }
    redirect(query.size ? `${target}?${query.toString()}` : target);
  }
  redirect(target);
}
