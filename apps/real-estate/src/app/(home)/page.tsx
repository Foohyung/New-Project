import Link from 'next/link';
import { HomeCard, LifestyleChips, NeighborhoodCard } from '@/components/homes';
import { MortgageCalculator } from '@/components/mortgage-calculator';
import { PropertyArt } from '@/components/property-art';
import { HomeFilterSchema } from '@/features/homes/service';
import { listHomes, listNeighborhoods } from '@/server/dal/homes';

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filter = HomeFilterSchema.parse(await searchParams);
  const [homes, hoods] = await Promise.all([listHomes(filter), listNeighborhoods()]);
  const filtered = filter.tags.length > 0 || Boolean(filter.q) || Boolean(filter.max) || Boolean(filter.listing);

  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-16 sm:px-7 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24">
        <div>
          <span className="inline-flex rounded-full bg-olive-soft px-3.5 py-1 text-sm font-semibold text-olive">🌿 หาบ้านจากไลฟ์สไตล์</span>
          <h1 className="mt-4 mb-4 font-display text-[38px] leading-tight font-medium sm:text-[54px]">
            บ้านที่ใช่ เริ่มจาก<br /><em className="text-terra not-italic">ชีวิตที่คุณอยากมี</em>
          </h1>
          <p className="max-w-[520px] text-lg text-muted">บอกเราว่าคุณใช้ชีวิตแบบไหน แล้วเราจะจับคู่บ้านและย่านที่เข้ากับคุณ ไม่ใช่แค่ดูจากราคา</p>
          <div className="my-6"><LifestyleChips filter={filter} /></div>
          <form method="get" action="/#homes" role="search" className="flex max-w-[560px] flex-wrap items-center gap-1 rounded-3xl bg-cream p-2 shadow-[0_16px_40px_rgba(43,33,28,.08)] sm:flex-nowrap sm:rounded-full">
            {filter.tags.length > 0 && <input type="hidden" name="tags" value={filter.tags.join(',')} />}
            <label htmlFor="q" className="sr-only">ย่าน จังหวัด หรือชื่อโครงการ</label>
            <input id="q" name="q" type="search" defaultValue={filter.q} placeholder="ย่าน จังหวัด หรือชื่อโครงการ" className="min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none" />
            <label htmlFor="max" className="sr-only">งบประมาณ</label>
            <select id="max" name="max" defaultValue={filter.max ?? ''} className="min-h-12 bg-transparent px-3 outline-none sm:border-l sm:border-line">
              <option value="">งบไม่จำกัด</option>
              <option value="5000000">ไม่เกิน 5 ล้าน</option>
              <option value="8000000">ไม่เกิน 8 ล้าน</option>
              <option value="15000000">ไม่เกิน 15 ล้าน</option>
            </select>
            <button type="submit" className="min-h-12 w-full rounded-full bg-terra px-6 font-semibold text-cream sm:w-auto">ค้นหาบ้าน</button>
          </form>
        </div>
        <div aria-hidden className="relative mx-auto h-[380px] w-full max-w-[560px] sm:h-[480px]">
          <div className="absolute top-0 right-0 h-[330px] w-[240px] overflow-hidden rounded-t-[200px] rounded-b-[28px] shadow-xl sm:right-10 sm:h-[450px] sm:w-[330px]">
            <PropertyArt id="hero-1" type="house" palette="warm" label="" />
          </div>
          <div className="absolute bottom-2 left-0 h-[150px] w-[170px] overflow-hidden rounded-[28px] border-8 border-sand shadow-xl sm:h-[200px] sm:w-[230px]">
            <PropertyArt id="hero-2" type="townhouse" palette="dusk" label="" />
          </div>
          <div className="absolute top-12 left-2 w-[200px] rounded-[20px] bg-cream p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div><small className="text-sm text-muted">ย่านอารีย์</small><b className="block font-display text-3xl leading-tight font-semibold text-terra">8.7</b></div>
              <small className="text-right text-xs text-muted">คะแนนน่าอยู่<br />จาก 10</small>
            </div>
          </div>
        </div>
      </section>

      <section id="hoods" className="scroll-mt-4 bg-olive-soft py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-7">
          <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <h2 className="font-display text-[30px] font-medium sm:text-[38px]">ย่านน่าอยู่ที่คนชอบ</h2>
            <p className="max-w-[460px] text-muted">คะแนนคำนวณจากระยะเดินถึงร้านค้า พื้นที่สีเขียว และการเดินทาง เพื่อให้เทียบย่านได้ง่ายขึ้น</p>
          </header>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {hoods.map(h => <NeighborhoodCard key={h.name} hood={h} />)}
          </div>
        </div>
      </section>

      <section id="homes" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16 sm:px-7 lg:py-20">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <h2 className="font-display text-[30px] font-medium sm:text-[38px]">บ้านที่เข้ากับไลฟ์สไตล์ของคุณ</h2>
          <p className="text-muted" aria-live="polite">พบ {homes.length} หลัง{filtered && <> · <Link href="/#homes" scroll={false} className="inline-flex min-h-11 items-center font-semibold text-terra underline underline-offset-4">ล้างตัวกรอง</Link></>}</p>
        </header>
        <div className="mb-7"><LifestyleChips filter={filter} /></div>
        {homes.length === 0 ? (
          <p className="rounded-[26px] border-2 border-dashed border-line p-12 text-center text-muted">ยังไม่มีบ้านที่ตรงทุกเงื่อนไขที่เลือก ลองเอาไลฟ์สไตล์หรืองบประมาณออกบางข้อ</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {homes.map(h => <HomeCard key={h.slug} home={h} />)}
          </div>
        )}
      </section>

      <section id="calc" className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-16 sm:px-7">
        <MortgageCalculator />
      </section>
    </main>
  );
}
