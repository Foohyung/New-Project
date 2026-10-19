import { formatBaht } from '@repo/utils';
import Link from 'next/link';
import { LIFESTYLE_LABEL, LIFESTYLES, toggleTag, type HomeFilter } from '@/features/homes/service';
import type { HomeDto, NeighborhoodDto } from '@/features/homes/types';
import { PropertyArt } from './property-art';

export function priceLabel(home: Pick<HomeDto, 'price' | 'listing'>): string {
  return home.listing === 'rent' ? `${formatBaht(home.price)}/เดือน` : formatBaht(home.price);
}

export function specsLabel(home: HomeDto): string {
  if (home.bedrooms === 0) return `${home.landSqWah ?? 0} ตร.ว.`;
  return `${home.bedrooms} นอน · ${home.areaSqm} ตร.ม.`;
}

/** ไลฟ์สไตล์เป็นลิงก์ (ทำงานได้แม้ปิด JavaScript) — aria-pressed บอกสถานะให้ screen reader */
export function LifestyleChips({ filter }: { filter: HomeFilter }) {
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label="ไลฟ์สไตล์">
      {LIFESTYLES.map(tag => {
        const on = filter.tags.includes(tag);
        const tags = toggleTag(filter.tags, tag);
        const params = new URLSearchParams();
        if (tags) params.set('tags', tags);
        if (filter.q) params.set('q', filter.q);
        if (filter.max) params.set('max', String(filter.max));
        if (filter.listing) params.set('listing', filter.listing);
        const query = params.toString();
        return (
          <li key={tag}>
            <Link
              href={`/${query ? `?${query}` : ''}#homes`}
              scroll={false}
              aria-pressed={on}
              role="button"
              className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 font-medium ${on ? 'border-ink bg-ink text-cream' : 'border-line bg-cream hover:border-terra'}`}
            >
              {LIFESTYLE_LABEL[tag]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function HomeCard({ home }: { home: HomeDto }) {
  return (
    <Link href={`/homes/${home.slug}`} className="group flex flex-col overflow-hidden rounded-[26px] bg-cream transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10]">
        <PropertyArt id={home.slug} type={home.art} palette={home.palette} label={`ภาพประกอบ ${home.title}`} />
        <span className="absolute top-3.5 left-3.5 rounded-full bg-cream px-3 py-0.5 text-sm font-bold text-olive">ตรงใจ {home.match}%</span>
        {(home.isNew || home.listing === 'rent') && (
          <span className="absolute top-3.5 right-3.5 rounded-full bg-ink px-3 py-0.5 text-sm font-semibold text-cream">{home.listing === 'rent' ? 'ให้เช่า' : 'ใหม่'}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-5 pt-4 pb-5">
        <h3 className="font-display text-xl font-medium">{home.title}</h3>
        <span className="text-muted">{home.location}</span>
        <ul className="my-1 flex flex-wrap gap-1.5">
          {home.tags.map(t => <li key={t} className="rounded-full bg-sand px-2.5 text-sm">{LIFESTYLE_LABEL[t]}</li>)}
        </ul>
        <div className="mt-auto flex items-baseline justify-between gap-2.5 border-t border-dashed border-line pt-3">
          <span className="font-display text-[22px] font-semibold">{priceLabel(home)}</span>
          <span className="text-sm whitespace-nowrap text-muted">{specsLabel(home)}</span>
        </div>
      </div>
    </Link>
  );
}

export function NeighborhoodCard({ hood }: { hood: NeighborhoodDto }) {
  return (
    <article className="flex flex-col gap-3.5 rounded-3xl bg-cream p-5">
      <header className="flex justify-between gap-2.5">
        <div>
          <h3 className="font-display text-[22px] font-medium">{hood.name}</h3>
          <span className="text-sm text-muted">{hood.province}</span>
        </div>
        <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-terra-soft font-display text-xl font-semibold text-terra-deep" aria-label={`คะแนนน่าอยู่ ${hood.score} จาก 10`}>{hood.score}</span>
      </header>
      <dl className="flex flex-col gap-2 text-sm">
        {hood.metrics.map(m => (
          <div key={m.label} className="grid grid-cols-[96px_1fr_28px] items-center gap-2 text-muted">
            <dt>{m.label}</dt>
            <dd aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sand"><span className="block h-full rounded-full bg-olive" style={{ width: `${m.value * 10}%` }} /></dd>
            <dd className="text-right font-semibold text-ink">{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-dashed border-line pt-3 text-sm text-muted">ราคากลาง<b className="block text-base text-ink">{hood.median}</b></p>
    </article>
  );
}
