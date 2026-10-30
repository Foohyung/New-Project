import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingCard, priceLabel } from '@/components/site/listing-card';
import { ResultsWithMap, SearchControls } from '@/components/site/search-controls';
import { activeFilterCount, SearchSchema, searchHref, searchTitle, shortPrice, type SearchQuery } from '@/features/homes/service';
import { searchHomes } from '@/server/dal/homes';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const parse = async (searchParams: Props['searchParams']): Promise<SearchQuery> => SearchSchema.parse(await searchParams);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = await parse(searchParams);
  const title = searchTitle(q);
  return {
    title,
    description: `ค้นหาประกาศ${title} จากเจ้าของและ agent ที่ตรวจสอบแล้ว อัปเดตทุกวัน`,
    alternates: { canonical: searchHref(q, { sort: undefined }) },
  };
}

const RELATED = [
  ['ขายคอนโด 1 ห้องนอน', { deal: 'sale', type: 'condo', beds: 1 }],
  ['ขายคอนโดไม่เกิน 2 ล้าน', { deal: 'sale', type: 'condo', price: 'p1' }],
  ['เช่าคอนโดเลี้ยงสัตว์ได้', { deal: 'rent', type: 'condo', pet: '1' }],
  ['ขายบ้านเดี่ยวนนทบุรี', { deal: 'sale', type: 'house', prov: 'non' }],
  ['คอนโดใกล้ BTS', { transit: '1', q: 'BTS' }],
] as const;

export default async function SearchPage({ searchParams }: Props) {
  const query = await parse(searchParams);
  const [results, all] = await Promise.all([searchHomes(query), searchHomes({})]);
  const now = new Date();
  const title = searchTitle(query);
  const projects = all.filter(h => h.project).map(h => ({ name: h.project?.name ?? '', location: h.location }));
  const pins = results.map(h => ({ slug: h.slug, title: h.title, label: shortPrice(h), price: priceLabel(h), x: h.mapPos[0], y: h.mapPos[1] }));

  return (
    <main>
      <SearchControls query={query} filterCount={activeFilterCount(query)} projects={projects} />
      <div className="mx-auto max-w-7xl px-4 pb-20 md:px-6 lg:pb-8">
        <ResultsWithMap pins={pins}>
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-x-1.5 pt-2 text-[13px] text-muted">
            <Link href="/" className="inline-flex min-h-11 min-w-11 items-center">หน้าแรก</Link><span aria-hidden>/</span>
            <Link href="/search" className="inline-flex min-h-11 items-center">รายการ ขาย เช่า</Link><span aria-hidden>/</span>
            <span aria-current="page" className="text-ink">{title}</span>
          </nav>
          <h1 className="text-xl leading-snug font-semibold md:text-2xl">{title}</h1>
          <p className="max-w-[80ch] text-sm text-muted" aria-live="polite">ค้นหาประกาศ{title} จากเจ้าของและ agent ที่ตรวจสอบแล้ว มีให้เลือก {results.length.toLocaleString('th-TH')} รายการ</p>
          {results.length === 0 ? (
            <div className="mt-4 grid justify-items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent"><Search aria-hidden className="size-7" /></span>
              <h2 className="text-lg font-semibold">ไม่พบประกาศที่ตรงกับเงื่อนไข</h2>
              <p className="text-muted">ลองเอาตัวกรองบางข้อออก เช่น ช่วงราคา หรือจำนวนห้องนอน</p>
              <Link href={searchHref({ deal: query.deal })} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-white">ล้างตัวกรอง</Link>
            </div>
          ) : (
            <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
              {results.map((h, i) => <ListingCard key={h.slug} home={h} now={now} spotlight={i < 2 && h.badges.includes('spotlight')} />)}
            </div>
          )}
          <section aria-labelledby="rel-h" className="mt-7">
            <h2 id="rel-h" className="mb-2 font-semibold">ค้นหาที่เกี่ยวข้อง</h2>
            <p className="flex flex-wrap gap-2">
              {RELATED.map(([label, q]) => <Link key={label} href={searchHref(q)} className="inline-flex min-h-11 items-center rounded-full bg-accent-soft px-3.5 text-sm font-medium text-accent">{label}</Link>)}
            </p>
          </section>
        </ResultsWithMap>
      </div>
    </main>
  );
}
