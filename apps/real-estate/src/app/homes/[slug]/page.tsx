import { formatBaht } from '@repo/utils';
import { ChevronLeft, TrainFront } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactForm } from '@/components/contact-form';
import { priceLabel } from '@/components/homes';
import { PropertyArt } from '@/components/property-art';
import { LIFESTYLE_LABEL } from '@/features/homes/service';
import { DEFAULT_TERMS, monthlyPayment } from '@/features/mortgage/service';
import { getHome } from '@/server/dal/homes';
import { siteUrl } from '@/server/site';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const home = await getHome((await params).slug);
  if (!home) return { title: 'ไม่พบประกาศ' };
  const description = `${home.title} ${home.location} ราคา ${priceLabel(home)} — ${home.description}`;
  return {
    title: home.title,
    description,
    alternates: { canonical: `/homes/${home.slug}` },
    openGraph: { title: home.title, description, url: `/homes/${home.slug}`, type: 'article' },
  };
}

export default async function HomeDetailPage({ params }: Props) {
  const home = await getHome((await params).slug);
  if (!home) notFound();

  const monthly = home.listing === 'sale' ? monthlyPayment({ price: home.price, ...DEFAULT_TERMS }) : null;
  // JSON-LD ตาม schema.org (§16) — ข้อมูลมาจากระบบเอง และ escape "<" ก่อนฝังลงหน้า (§10.3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: home.title,
    description: home.description,
    url: `${siteUrl()}/homes/${home.slug}`,
    offers: { '@type': 'Offer', price: home.price / 100, priceCurrency: 'THB', businessFunction: home.listing === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' },
    address: { '@type': 'PostalAddress', addressLocality: home.location, addressRegion: home.province, addressCountry: 'TH' },
  };
  const specs = [
    home.bedrooms > 0 && ['ห้องนอน', `${home.bedrooms} ห้อง`],
    home.bathrooms > 0 && ['ห้องน้ำ', `${home.bathrooms} ห้อง`],
    home.bedrooms > 0 && ['พื้นที่ใช้สอย', `${home.areaSqm} ตร.ม.`],
    home.landSqWah && ['ที่ดิน', `${home.landSqWah} ตร.ว.`],
  ].filter((x): x is [string, string] => Array.isArray(x));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-7">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Link href="/#homes" className="inline-flex min-h-11 items-center gap-1 font-medium text-muted"><ChevronLeft aria-hidden className="size-5" />กลับไปหน้าค้นหา</Link>

      <div className="mt-3 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <article>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[28px]">
            <PropertyArt id={`detail-${home.slug}`} type={home.art} palette={home.palette} label={`ภาพประกอบ ${home.title}`} />
            <span className="absolute top-4 left-4 rounded-full bg-cream px-3.5 py-1 font-bold text-olive">ตรงใจ {home.match}%</span>
          </div>
          <p className="mt-6 text-muted">{home.location}</p>
          <h1 className="font-display text-3xl font-medium sm:text-4xl">{home.title}</h1>
          <p className="mt-3 font-display text-3xl font-semibold">{priceLabel(home)}</p>
          {monthly !== null && <p className="mt-1 font-semibold text-terra-deep">ผ่อนประมาณ {formatBaht(monthly)}/เดือน <span className="font-normal text-muted">(ดาวน์ {DEFAULT_TERMS.downPct}% · {DEFAULT_TERMS.years} ปี · {DEFAULT_TERMS.ratePct}%)</span></p>}
          {home.transit && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-olive-soft px-3 py-1 text-sm font-semibold text-olive"><TrainFront aria-hidden className="size-4" />{home.transit}</p>}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="ไลฟ์สไตล์">
            {home.tags.map(t => <li key={t} className="rounded-full bg-cream px-3 py-1 text-sm">{LIFESTYLE_LABEL[t]}</li>)}
          </ul>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-cream p-4"><dt className="text-sm text-muted">{k}</dt><dd className="font-display text-lg font-medium">{v}</dd></div>
            ))}
          </dl>
          <h2 className="mt-8 font-display text-2xl font-medium">รายละเอียด</h2>
          <p className="mt-2 max-w-prose">{home.description}</p>
        </article>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-[28px] bg-cream p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-terra-soft font-semibold text-terra-deep">{home.agent.initials}</span>
              <div><b className="block">{home.agent.name}</b><small className="text-muted">{home.agent.responseTime}</small></div>
            </div>
            <h2 className="mb-4 font-display text-xl font-medium">นัดชมหรือสอบถาม</h2>
            <ContactForm homeSlug={home.slug} />
          </section>
        </aside>
      </div>
    </main>
  );
}
