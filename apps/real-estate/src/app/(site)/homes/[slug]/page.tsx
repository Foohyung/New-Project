import { formatBaht, formatThaiDateOf } from '@repo/utils';
import { Bath, BadgeCheck, BedDouble, Building2, Camera, Check, ChevronLeft, Clock, Eye, LandPlot, MapPin, Maximize, MessageCircle, Phone, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactForm } from '@/components/contact-form';
import { MapArt, PropertyArt } from '@/components/property-art';
import { DetailTools, ExpandText, LoanEstimate, NearbyPlaces, type NearKind } from '@/components/site/detail-widgets';
import { ListingCard, ListingTags, priceLabel } from '@/components/site/listing-card';
import { areaById, provinceLabel } from '@/features/homes/catalog';
import { pricePerSqm, searchHref, updatedLabel } from '@/features/homes/service';
import type { HomeDto } from '@/features/homes/types';
import { getHome, similarHomes } from '@/server/dal/homes';
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

/** สถานที่ใกล้เคียง — ระยะที่ 1 เป็นข้อมูลตัวอย่าง · ระยะที่ 2 คำนวณจากพิกัดจริง (PostGIS) */
function nearbyOf(home: HomeDto): { kind: NearKind; name: string; distance: string }[] {
  const transit = home.transit?.match(/^(.*?)\s([\d.,]+\s?(?:กม|ม)\.)$/);
  return [
    { kind: 'mall', name: 'ห้างสรรพสินค้าใกล้เคียง', distance: '0.6 กม.' },
    transit ? { kind: 'transit', name: transit[1] ?? '', distance: transit[2] ?? '' } : { kind: 'other', name: 'ป้ายรถโดยสาร', distance: '0.4 กม.' },
    { kind: 'hospital', name: 'โรงพยาบาล', distance: '1.4 กม.' },
    { kind: 'school', name: 'มหาวิทยาลัย / โรงเรียน', distance: '1.9 กม.' },
    { kind: 'other', name: 'ตลาดสด', distance: '0.8 กม.' },
  ];
}

export default async function HomeDetailPage({ params }: Props) {
  const home = await getHome((await params).slug);
  if (!home) notFound();
  const similar = await similarHomes(home);
  const now = new Date();
  const sqm = pricePerSqm(home);
  const place = (home.area ? areaById(home.area)?.label : undefined) ?? home.location.split(',')[0] ?? home.location;
  const a = home.agent;

  // JSON-LD ตาม schema.org (§16) — ข้อมูลมาจากระบบเอง และ escape "<" ก่อนฝังลงหน้า (§10.3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: home.title,
    description: home.description,
    url: `${siteUrl()}/homes/${home.slug}`,
    datePosted: home.createdAt,
    offers: { '@type': 'Offer', price: home.price / 100, priceCurrency: 'THB', businessFunction: home.listing === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' },
    address: { '@type': 'PostalAddress', addressLocality: home.location, addressRegion: provinceLabel(home.province), addressCountry: 'TH' },
  };
  const longDesc = [
    home.description,
    '',
    `📍 ${home.project?.name ?? place}`,
    `• ขนาด ${home.areaSqm.toLocaleString('th-TH')} ตร.ม.${home.landSqWah ? ` · ที่ดิน ${String(home.landSqWah)} ตร.ว.` : ''}`,
    home.bedrooms > 0 ? `• ${String(home.bedrooms)} ห้องนอน ${String(home.bathrooms)} ห้องน้ำ` : null,
    home.floor !== '-' ? `• ${home.floor}` : null,
    sqm !== null ? `• ราคาเฉลี่ย ${formatBaht(sqm)}/ตร.ม.` : null,
    `• ราคา ${priceLabel(home)}`,
    '',
    'นัดชมได้ทุกวัน ติดต่อผ่านแบบฟอร์มหรือโทรหาผู้ลงประกาศ',
  ].filter(x => x !== null).join('\n');
  const info = [
    { icon: Maximize, label: 'พื้นที่ใช้สอย', value: `${home.areaSqm.toLocaleString('th-TH')} ตร.ม.` },
    { icon: Building2, label: 'ชั้น', value: home.floor },
    ...(home.bedrooms > 0 ? [{ icon: BedDouble, label: 'ห้องนอน', value: String(home.bedrooms) }, { icon: Bath, label: 'ห้องน้ำ', value: String(home.bathrooms) }] : []),
    ...(home.landSqWah ? [{ icon: LandPlot, label: 'ที่ดิน', value: `${String(home.landSqWah)} ตร.ว.` }] : []),
  ];
  const shots = [
    { type: home.type, palette: home.palette },
    { type: home.type === 'land' ? home.type : 'condo', palette: 'night' },
    { type: home.type, palette: 'dusk' },
    { type: home.type, palette: home.palette },
  ] as const;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 md:px-6 lg:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-x-1.5 pt-1 text-[13px] text-muted">
        <Link href="/" className="inline-flex min-h-11 min-w-11 items-center">หน้าแรก</Link><span aria-hidden>/</span>
        <Link href={searchHref({ deal: home.listing })} className="inline-flex min-h-11 items-center">รายการ ขาย เช่า</Link><span aria-hidden>/</span>
        <Link href={searchHref({ deal: home.listing, prov: home.province, area: home.area ?? undefined })} className="inline-flex min-h-11 min-w-11 items-center">{place}</Link><span aria-hidden>/</span>
        <span aria-current="page" className="max-w-full truncate text-ink">{home.title}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2 pb-2.5">
        <Link href={searchHref({ deal: home.listing })} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-surface pr-3.5 pl-2 font-medium"><ChevronLeft aria-hidden className="size-5" />กลับ</Link>
        {home.project && <Link href={searchHref({ q: home.project.name.split(' ')[0] })} className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">{home.project.name}</Link>}
        <DetailTools slug={home.slug} title={home.title} />
      </div>

      <div className="relative -mx-4 md:mx-0 md:grid md:h-[400px] md:grid-cols-[2fr_1fr] md:grid-rows-2 md:gap-2 md:overflow-hidden md:rounded-2xl">
        <div tabIndex={0} aria-label="ภาพประกาศ เลื่อนดูได้" className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:contents">
          {shots.map((s, i) => (
            <div key={i} className={`aspect-[4/3] w-full shrink-0 snap-start md:aspect-auto md:min-h-0 ${i === 0 ? 'md:row-span-2' : ''} ${i === 3 ? 'md:hidden' : ''}`}>
              <PropertyArt id={`shot-${String(i)}`} type={s.type} palette={s.palette} label={`${home.title} ภาพที่ ${String(i + 1)}`} variant={i} />
            </div>
          ))}
        </div>
        <span className="absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/95 px-3 text-sm font-semibold"><Camera aria-hidden className="size-[18px]" />{home.photos} รูป</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0">
          <div className="grid gap-1.5 pt-3.5 pb-1.5">
            <ListingTags home={home} />
            <p className="flex flex-wrap justify-end gap-2 text-[13px] text-muted"><span className="inline-flex items-center gap-1"><Eye aria-hidden className="size-[15px]" />เข้าชม {home.views.toLocaleString('th-TH')} ครั้ง</span></p>
            <h1 className="text-xl leading-normal font-semibold md:text-2xl">{home.title}</h1>
            <p className="flex items-center gap-1 text-muted"><MapPin aria-hidden className="size-4" />{home.location}{home.transit && <> · {home.transit}</>}</p>
            <p className="text-[26px] font-bold text-navy">
              {home.priceFrom && <small className="text-sm font-medium text-muted">เริ่ม </small>}{formatBaht(home.price)}{home.listing === 'rent' && <small className="text-sm font-medium text-muted"> /เดือน</small>}
              {sqm !== null && <small className="text-sm font-medium text-muted"> ({formatBaht(sqm)}/ตร.ม.)</small>}
            </p>
            <p className="flex flex-wrap justify-between gap-2 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-[15px]" />ลงประกาศ {formatThaiDateOf(home.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><Sparkles aria-hidden className="size-[15px]" />{updatedLabel(home.updatedAt, now)}</span>
            </p>
          </div>

          <section aria-labelledby="info-h" className="border-t border-line py-4.5">
            <h2 id="info-h" className="mb-3 text-lg font-semibold">ข้อมูลอสังหาฯ</h2>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {info.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-navy"><Icon className="size-5" /></span>
                  <div><dt className="text-xs text-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>
                </div>
              ))}
            </dl>
          </section>

          {home.project && (
            <section aria-labelledby="proj-h" className="border-t border-line py-4.5">
              <h2 id="proj-h" className="mb-2 text-lg font-semibold">ข้อมูลโครงการ</h2>
              <p><strong>{home.project.name}</strong> โดย {home.project.developer} · {home.project.units} ยูนิต · {home.project.status}</p>
              {home.project.promo && <p className="mt-2 inline-flex rounded-lg bg-cta-soft px-2.5 py-0.5 font-semibold text-navy">โปรโมชัน: {home.project.promo}</p>}
            </section>
          )}

          <section aria-labelledby="desc-h" className="border-t border-line py-4.5">
            <h2 id="desc-h" className="mb-2 text-lg font-semibold">รายละเอียด</h2>
            <ExpandText>{longDesc}</ExpandText>
          </section>

          <section aria-labelledby="hl-h" className="border-t border-line py-4.5">
            <h2 id="hl-h" className="mb-2 text-lg font-semibold">จุดเด่นทรัพย์</h2>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <li className="flex min-h-9 items-center gap-2.5"><Check aria-hidden className="size-5 text-accent" />{home.market === 'new' ? 'ทรัพย์มือ 1' : 'ทรัพย์มือ 2'}</li>
              {home.features.map(f => <li key={f} className="flex min-h-9 items-center gap-2.5"><Check aria-hidden className="size-5 text-accent" />{f}</li>)}
            </ul>
          </section>

          <section aria-labelledby="loc-h" className="border-t border-line py-4.5">
            <h2 id="loc-h" className="mb-2 text-lg font-semibold">ที่ตั้งและทำเล</h2>
            <p className="mb-2.5 flex items-center gap-1 text-muted"><MapPin aria-hidden className="size-4" />{home.location}{home.project && ` · ${home.project.name}`}</p>
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              <MapArt label="แผนที่ประกอบทำเล (ไม่ใช่ตำแหน่งจริง)" />
              <MapPin aria-hidden className="absolute top-[46%] left-1/2 size-10 -translate-x-1/2 -translate-y-full fill-navy text-cta" />
            </div>
            <h3 className="mt-4 font-semibold">สถานที่ใกล้เคียง</h3>
            <NearbyPlaces places={nearbyOf(home)} />
          </section>

          {home.listing === 'sale' && (
            <section aria-labelledby="loan-h" className="border-t border-line py-4.5">
              <h2 id="loan-h" className="mb-2 text-lg font-semibold">คำนวณสินเชื่อ</h2>
              <LoanEstimate price={home.price} />
            </section>
          )}

          <section className="mt-2 grid gap-3 rounded-2xl bg-gradient-to-r from-accent-soft to-cta-soft p-5 md:grid-cols-[1fr_auto] md:items-center md:px-8">
            <div>
              <h2 className="text-xl leading-snug font-semibold">ยังไม่เจอ <em className="text-accent not-italic">{home.project?.name ?? place}</em> ที่ต้องการ?</h2>
              <p className="text-muted">ดูประกาศอื่นในทำเลเดียวกัน หรือปรับตัวกรองให้กว้างขึ้น</p>
            </div>
            <Link href={searchHref({ deal: home.listing, prov: home.province, area: home.area ?? undefined })} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-cta px-5 font-semibold text-on-cta hover:bg-cta-strong"><Search aria-hidden className="size-5" />ดูประกาศใน{place}</Link>
          </section>
        </div>

        <aside id="contact" aria-labelledby="contact-h" className="scroll-mt-28 rounded-2xl border border-line bg-surface p-4 shadow-sm lg:sticky lg:top-28 lg:mt-3.5 lg:self-start">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-[52px] shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-navy">{a.initials}</span>
            <div className="leading-snug">
              <b className="flex items-center gap-1">{a.name}{a.verified && <BadgeCheck aria-label="ยืนยันตัวตนแล้ว" className="size-[18px] text-go" />}</b>
              <small className="block text-muted">{a.company} · {a.responseTime}</small>
            </div>
          </div>
          <div className="my-3 grid grid-cols-2 gap-2">
            <a href={`tel:${a.phone.replaceAll('-', '')}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line font-semibold"><Phone aria-hidden className="size-[18px]" />{a.phone}</a>
            <a href="https://line.me/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-line-brand font-semibold"><MessageCircle aria-hidden className="size-[18px] text-line-brand" />LINE</a>
          </div>
          <h2 id="contact-h" className="mb-2 font-semibold">ส่งข้อความถึงผู้ลงประกาศ</h2>
          <ContactForm homeSlug={home.slug} />
          <p className="mt-3 flex gap-1.5 text-[13px] text-muted"><ShieldCheck aria-hidden className="size-4 shrink-0" />อย่าโอนเงินจองก่อนเห็นทรัพย์จริงและตรวจสอบโฉนด</p>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="sim-h" className="pt-8">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 id="sim-h" className="text-xl font-semibold text-navy">ประกาศอื่นๆ ใน{provinceLabel(home.province)}</h2>
            <Link href={searchHref({ prov: home.province })} className="inline-flex min-h-11 min-w-11 items-center text-sm font-medium text-accent underline underline-offset-4">ดูทั้งหมด</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similar.map(h => <ListingCard key={h.slug} home={h} now={now} />)}
          </div>
        </section>
      )}

      {/* แถบติดต่อ agent ติดล่างจอ (จอเล็ก) — จอใหญ่ใช้กล่องติดต่อด้านขวาแทน */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-surface pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] shadow-[0_-6px_22px_rgba(15,26,46,.1)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 md:px-6">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-navy">{a.initials}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block truncate">{a.name}</b>
            <small className="block truncate text-xs text-muted">{priceLabel(home)}</small>
          </span>
          <a href={`tel:${a.phone.replaceAll('-', '')}`} aria-label={`โทรหา ${a.name}`} className="grid size-11 shrink-0 place-items-center rounded-full border border-line"><Phone aria-hidden className="size-5" /></a>
          <a href="#contact" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-go px-4 font-semibold text-white"><MessageCircle aria-hidden className="size-5" />ติดต่อ</a>
        </div>
      </div>
    </main>
  );
}

