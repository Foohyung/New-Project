import { BadgeCheck, MapPin, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { HomeSection } from '@/components/site/home-section';
import { Scroller, TransitPicker } from '@/components/site/home-widgets';
import { ListingCard } from '@/components/site/listing-card';
import { HeroSearch } from '@/components/site/search-box';
import { PropertyArt, TypeArt } from '@/components/property-art';
import { AREAS, PROPERTY_TYPES, provinceLabel } from '@/features/homes/catalog';
import { searchHref, shortPrice } from '@/features/homes/service';
import { listAgents, searchHomes } from '@/server/dal/homes';

const AGENT_INFO: Record<string, { areas: string; tags: string[]; quote: string }> = {
  กฤ: { areas: 'กรุงเทพฯ · ปริมณฑล', tags: ['คอนโด', 'บ้านเดี่ยว'], quote: 'ดูแลตั้งแต่นัดชมจนโอนกรรมสิทธิ์' },
  ธน: { areas: 'กรุงเทพฯ · นนทบุรี', tags: ['ทาวน์โฮม', 'อาคารพาณิชย์'], quote: 'ทรัพย์ทุกชิ้นตรวจโฉนดแล้ว' },
  มล: { areas: 'เชียงใหม่ · ปทุมธานี', tags: ['บ้าน', 'ที่ดิน'], quote: 'ถนัดบ้านพักและที่ดินภาคเหนือ' },
  ขย: { areas: 'ทั่วประเทศ', tags: ['โครงการใหม่'], quote: 'ราคาตรงจากผู้พัฒนาโครงการ' },
};

export default async function HomePage() {
  const [all, agents] = await Promise.all([searchHomes({}), listAgents()]);
  const now = new Date();
  const recommended = all.filter(h => h.market === 'resale').slice(0, 8);
  const projects = all.filter(h => h.project);
  const suggestions = projects.map(h => ({ name: h.project?.name ?? h.title, location: h.location }));

  return (
    <main>
      <section className="relative z-10 bg-navy pt-5 pb-7 text-white md:pt-9 md:pb-11">
        <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-[300px] w-[min(360px,60vw)] rounded-bl-full bg-navy-2/70" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 md:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-cta"><Sparkles aria-hidden className="size-4" />ประกาศทั้งหมด {all.length.toLocaleString('th-TH')} รายการ อัปเดตทุกวัน</span>
            <h1 className="mt-1 text-2xl leading-snug font-bold text-balance md:text-[34px]">ซื้อ ขาย ให้เช่า บ้าน คอนโด ที่ดิน <em className="text-cta not-italic">ใกล้รถไฟฟ้า</em> ลงประกาศฟรี</h1>
            <p className="max-w-[46ch] text-navy-muted">ค้นจากทำเล สถานี หรือชื่อโครงการ เทียบราคาต่อ ตร.ม. ได้ทันที</p>
            <HeroSearch projects={suggestions} />
          </div>
          <div aria-hidden className="relative hidden aspect-[5/4] lg:block">
            <div className="absolute inset-[0_0_40px_40px] overflow-hidden rounded-3xl shadow-2xl"><PropertyArt id="hero" type="condo" palette="dusk" label="" variant={1} /></div>
            <div className="absolute bottom-0 left-0 rounded-2xl bg-surface px-3.5 py-2.5 text-sm leading-snug text-ink shadow-xl"><small>ราคาเฉลี่ยคอนโดใกล้ BTS</small><b className="block text-lg text-accent">฿118,400/ตร.ม.</b></div>
            <div className="absolute top-6 -right-2 rounded-2xl bg-surface px-3.5 py-2.5 text-sm leading-snug text-ink shadow-xl"><small>เดินถึงสถานี</small><b className="block text-lg text-accent">350 ม.</b></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <HomeSection id="types">
          <Scroller label="ประเภทอสังหาฯ" title={<h2 id="types-h" className="text-xl font-semibold text-navy md:text-2xl">ประเภทอสังหาฯ</h2>}>
            {PROPERTY_TYPES.map(t => (
              <Link key={t.id} href={searchHref({ type: t.id })} className="group flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 text-center text-sm leading-snug lg:w-[calc((100%-9*14px)/10)]">
                <span className="grid size-[72px] place-items-center overflow-hidden rounded-full border border-line bg-surface shadow-sm group-hover:border-accent group-hover:ring-3 group-hover:ring-accent/20"><TypeArt type={t.id} /></span>
                <span className="group-hover:text-accent">{t.label}</span>
              </Link>
            ))}
          </Scroller>
        </HomeSection>

        <HomeSection id="areas">
          <Scroller label="ทำเลยอดนิยม" title={<h2 id="areas-h" className="text-xl font-semibold text-navy md:text-2xl">ทำเลยอดนิยม</h2>} action={<Link href="/search" className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4">ทำเลอื่นๆ</Link>}>
            {AREAS.map((a, i) => (
              <Link key={a.id} href={searchHref({ prov: a.province, area: a.id })} className={`relative block aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-2xl text-white after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:from-40% after:to-[#05122d]/80 ${i % 2 ? 'w-[52%] max-w-[220px] lg:w-[220px]' : 'w-[78%] max-w-[340px] lg:w-[340px]'}`}>
                <PropertyArt id={`area-${a.id}`} type={a.kind} palette={a.palette} label="" variant={i} />
                <span className="absolute inset-x-3 bottom-2.5 z-10 leading-snug"><strong className="block">{a.label}</strong><small className="text-[13px] opacity-90">{a.count.toLocaleString('th-TH')} ประกาศ</small></span>
              </Link>
            ))}
          </Scroller>
        </HomeSection>

        <HomeSection id="recommended" title="ประกาศแนะนำ" more={{ href: searchHref({ deal: 'sale' }), label: 'ดูทั้งหมด' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommended.map((h, i) => <ListingCard key={h.slug} home={h} now={now} spotlight={i < 4 && h.badges.includes('spotlight')} />)}
          </div>
        </HomeSection>
      </div>

      {projects.length > 0 && (
        <section aria-labelledby="projects-h" className="mt-8 bg-surface py-7 md:mt-10 md:py-10">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <Scroller label="โครงการใหม่" title={<h2 id="projects-h" className="text-xl font-semibold text-navy md:text-2xl">โครงการใหม่น่าสนใจ</h2>} action={<Link href={searchHref({ deal: 'sale', market: 'new' })} className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4">ดูทั้งหมด</Link>}>
              {projects.map(h => h.project && (
                <article key={h.slug} className="relative w-[84%] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:w-[calc((100%-2*14px)/3)] lg:max-w-none">
                  <div className="relative aspect-[16/10]">
                    <PropertyArt id={`proj-${h.slug}`} type={h.type} palette={h.palette} label={`ภาพประกอบ ${h.project.name}`} variant={1} />
                    <span className="absolute right-2.5 bottom-2.5 rounded-xl bg-surface px-2.5 py-0.5 text-right text-xs leading-tight">เริ่มต้น<b className="block text-lg text-accent">{shortPrice(h)}</b></span>
                  </div>
                  <div className="px-3.5 py-3">
                    <h3 className="font-semibold"><Link href={`/homes/${h.slug}`} className="after:absolute after:inset-0">{h.project.name}</Link></h3>
                    <p className="flex items-center gap-1 text-[13px] text-muted"><MapPin aria-hidden className="size-[15px]" />{h.location}</p>
                    <dl className="-mx-3.5 my-2.5 grid grid-cols-4 border-y border-line py-2 text-center text-xs text-muted">
                      <div><dt>ยูนิต</dt><dd className="text-[15px] font-semibold text-navy">{h.project.units}</dd></div>
                      <div><dt>ห้องนอน</dt><dd className="text-[15px] font-semibold text-navy">{h.bedrooms}+</dd></div>
                      <div><dt>ชั้น</dt><dd className="text-[15px] font-semibold text-navy">{h.project.floors}</dd></div>
                      <div><dt>เริ่มต้น</dt><dd className="text-[15px] font-semibold text-navy">{shortPrice(h)}</dd></div>
                    </dl>
                    <p className="flex items-center gap-2 text-[13px]"><span aria-hidden className="grid size-7 place-items-center rounded-lg bg-navy text-[11px] font-bold text-white">{h.project.developer.replace('สมมติ ', '').slice(0, 2)}</span>{h.project.developer}</p>
                    {h.project.promo && <p className="mt-2 inline-flex rounded-md bg-cta-soft px-2 text-[13px] font-semibold text-navy">{h.project.promo}</p>}
                  </div>
                </article>
              ))}
            </Scroller>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <HomeSection id="agents">
          <Scroller label="agent แนะนำ" title={<h2 id="agents-h" className="text-xl font-semibold text-navy md:text-2xl">agent แนะนำ</h2>} action={<Link href="/agent/login" className="inline-flex min-h-11 items-center rounded-full bg-go px-4 text-sm font-semibold text-white hover:bg-go-strong">สมัครเป็น agent</Link>}>
            {agents.map(a => {
              const info = AGENT_INFO[a.initials];
              return (
                <article key={a.name} className="flex w-[72%] max-w-[250px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:w-[calc((100%-3*14px)/4)] lg:max-w-none">
                  <div className="relative grid aspect-[5/4] place-items-center bg-gradient-to-br from-accent-soft to-[#d5e3f8]">
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-go px-2.5 text-xs font-bold text-white"><Star aria-hidden className="size-3.5" />Top agent</span>
                    <span aria-hidden className="grid size-24 place-items-center rounded-full border-4 border-white bg-accent text-3xl font-bold text-white">{a.initials}</span>
                    <a href={`tel:${a.phone.replaceAll('-', '')}`} className="absolute right-2 bottom-2 inline-flex min-h-11 items-center rounded-full bg-[#0f1a2e]/65 px-3.5 text-[13px] font-semibold text-white">ติดต่อ<span className="sr-only"> {a.name}</span></a>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 px-3 pt-2.5 pb-3">
                    <strong className="flex items-center gap-1">{a.name}{a.verified && <BadgeCheck aria-label="ยืนยันตัวตนแล้ว" className="size-4 text-go" />}</strong>
                    <span className="text-[13px] text-muted"><b className="text-[#8a5a00]">★ {a.rating.toFixed(1)}</b> · {info?.areas}</span>
                    <span className="flex flex-wrap gap-1">{info?.tags.map(t => <span key={t} className="rounded-md border border-line px-1.5 text-xs">{t}</span>)}</span>
                    {info && <p className="mt-auto border-t border-dashed border-line pt-1.5 text-[13px] text-muted">{info.quote}</p>}
                  </div>
                </article>
              );
            })}
          </Scroller>
        </HomeSection>

        <HomeSection id="transit" title="ค้นหาตามเส้นทางรถไฟฟ้า" description="เลือกสาย แล้วแตะสถานีเพื่อดูประกาศรอบสถานี" more={{ href: searchHref({ transit: '1' }), label: 'สถานีทั้งหมด' }}>
          <TransitPicker />
        </HomeSection>

        <HomeSection id="hot" title="ทำเลมาแรงเดือนนี้" description="จัดอันดับจากยอดค้นหา พร้อมราคากลางคอนโดต่อ ตร.ม. (ข้อมูลตัวอย่าง)" more={{ href: '/search', label: 'ทั้งหมด' }}>
          <ol className="grid gap-2 md:grid-cols-2">
            {AREAS.slice(0, 6).map((a, i) => (
              <li key={a.id}>
                <Link href={searchHref({ prov: a.province, area: a.id })} className="grid min-h-16 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line bg-surface py-2 pr-3 pl-2 hover:border-accent sm:grid-cols-[28px_64px_minmax(0,1fr)_auto]">
                  <span className="text-center text-lg font-bold text-accent">{i + 1}</span>
                  <span className="hidden h-12 w-16 overflow-hidden rounded-lg sm:block"><PropertyArt id={`hot-${a.id}`} type={a.kind} palette={a.palette} label="" variant={i} /></span>
                  <span className="leading-snug"><strong className="block">{a.label}</strong><small className="text-[13px] text-muted">{provinceLabel(a.province)} · {a.count.toLocaleString('th-TH')} ประกาศ</small></span>
                  <span className="text-right text-[13px] leading-snug text-muted"><b className="block text-sm text-ink">฿{Math.round(a.medianSqm / 1000)}K/ตร.ม.</b><span className="font-semibold text-go">▲ {a.trendPct.toFixed(1)}%</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </HomeSection>
      </div>
    </main>
  );
}
