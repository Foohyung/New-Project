import { formatBaht } from '@repo/utils';
import { Bath, BedDouble, Building2, Eye, MapPin, Maximize, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { typeLabel } from '@/features/homes/catalog';
import { BADGE_LABEL, pricePerSqm, updatedLabel } from '@/features/homes/service';
import type { HomeDto } from '@/features/homes/types';
import { PropertyArt } from '../property-art';
import { FavoriteButton } from './favorites';

export function priceLabel(home: Pick<HomeDto, 'price' | 'listing'>): string {
  return home.listing === 'rent' ? `${formatBaht(home.price)}/เดือน` : formatBaht(home.price);
}

export function ListingTags({ home }: { home: HomeDto }) {
  return (
    <ul className="flex flex-wrap gap-1 text-xs font-semibold" aria-label="ประเภทประกาศ">
      <li className="rounded-md bg-go px-2 leading-[1.8] text-white">{typeLabel(home.type)}</li>
      <li className="rounded-md border border-[#bfe3cb] bg-go-soft px-2 leading-[1.7] text-go-strong">{home.listing === 'rent' ? 'เช่า' : 'ขาย'}</li>
      <li className="rounded-md border border-line bg-surface-2 px-2 leading-[1.7] text-muted">{home.market === 'new' ? 'มือ 1' : 'มือ 2'}</li>
      {home.badges.filter(b => b === 'pet' || b === 'promo' || b === 'verified').map(b => (
        <li key={b} className="rounded-md border border-line bg-surface-2 px-2 leading-[1.7] text-muted">{BADGE_LABEL[b]}</li>
      ))}
    </ul>
  );
}

export function ListingSpecs({ home, className = '' }: { home: HomeDto; className?: string }) {
  return (
    <p className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] ${className}`}>
      {home.bedrooms > 0 && <span className="inline-flex items-center gap-1"><BedDouble aria-hidden className="size-[15px] text-muted" /><span className="sr-only">ห้องนอน</span>{home.bedrooms}</span>}
      {home.bathrooms > 0 && <span className="inline-flex items-center gap-1"><Bath aria-hidden className="size-[15px] text-muted" /><span className="sr-only">ห้องน้ำ</span>{home.bathrooms}</span>}
      {home.floor !== '-' && <span className="inline-flex items-center gap-1"><Building2 aria-hidden className="size-[15px] text-muted" />{home.floor}</span>}
      <span className="inline-flex items-center gap-1"><Maximize aria-hidden className="size-[15px] text-muted" />{home.areaSqm.toLocaleString('th-TH')} ตร.ม.</span>
    </p>
  );
}

/** การ์ดประกาศแบบพอร์ทัล — ทั้งการ์ดกดได้ (ลิงก์ที่หัวข้อขยายเต็มการ์ด) ส่วนปุ่มหัวใจ/ติดต่ออยู่เหนือชั้นลิงก์ */
export function ListingCard({ home, now, spotlight = false }: { home: HomeDto; now: Date; spotlight?: boolean }) {
  const sqm = pricePerSqm(home);
  return (
    <article data-slug={home.slug} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_2px_8px_rgba(15,26,46,.06)] border-line transition-shadow hover:shadow-xl data-[hl=true]:border-accent data-[hl=true]:ring-2 data-[hl=true]:ring-accent`}>
      <div className="relative aspect-[4/3] bg-surface-2">
        <PropertyArt id={`card-${home.slug}`} type={home.type} palette={home.palette} label={`ภาพประกอบ ${home.title}`} />
        {spotlight && <span className="absolute top-2.5 left-0 z-10 inline-flex items-center gap-1 rounded-r-full bg-gradient-to-r from-[#0e7490] to-[#3b5bdb] py-0.5 pr-3 pl-2.5 text-xs font-bold text-white"><Sparkles aria-hidden className="size-3.5" />Spotlight</span>}
        <FavoriteButton slug={home.slug} title={home.title} className="absolute top-0.5 right-0.5" />
        <span aria-hidden title={home.agent.name} className="absolute bottom-2.5 left-2.5 z-10 grid size-[34px] place-items-center rounded-full border-2 border-white bg-surface text-xs font-bold text-navy shadow">{home.agent.initials}</span>
        <Link href={`/homes/${home.slug}#contact`} className="absolute right-2 bottom-1.5 z-10 grid min-h-11 place-items-center">
          <span className="rounded-full bg-[#0f1a2e]/65 px-3 py-0.5 text-[13px] font-semibold text-white">ติดต่อ<span className="sr-only"> ผู้ลงประกาศ {home.title}</span></span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 pt-2.5 pb-3">
        <ListingTags home={home} />
        <h3 className="line-clamp-2 text-[15px] leading-normal font-semibold">
          <Link href={`/homes/${home.slug}`} className="after:absolute after:inset-0">{home.title}</Link>
        </h3>
        <p className="flex min-w-0 items-center gap-1 text-[13px] text-muted"><MapPin aria-hidden className="size-[15px] shrink-0" /><span className="truncate">{home.project?.name ?? home.location}</span></p>
        <ListingSpecs home={home} />
        <p className="mt-1 text-xl leading-tight font-bold text-navy">
          {home.priceFrom && <small className="text-[13px] font-medium text-muted">เริ่ม </small>}{formatBaht(home.price)}{home.listing === 'rent' && <small className="text-[13px] font-medium text-muted"> /เดือน</small>}
        </p>
        {sqm !== null && <p className="text-xs text-muted">({formatBaht(sqm)}/ตร.ม.)</p>}
        <p className="mt-auto flex justify-between pt-2 text-xs text-muted">
          <span>{updatedLabel(home.updatedAt, now)}</span>
          <span className="inline-flex items-center gap-1"><Eye aria-hidden className="size-3.5" /><span className="sr-only">เข้าชม</span>{home.views.toLocaleString('th-TH')}</span>
        </p>
      </div>
    </article>
  );
}
