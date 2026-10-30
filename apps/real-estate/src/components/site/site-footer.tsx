import Link from 'next/link';
import { DIRECTORY } from '@/features/homes/catalog';
import { searchHref } from '@/features/homes/service';
import { Logo } from './site-header';

/** ลิงก์ไดเรกทอรีตามทำเล/ประเภท (ช่วย SEO และคนที่ชอบไล่ดูตามย่าน) + footer */
export function SiteFooter() {
  return (
    <>
      <section aria-labelledby="dir-h" className="mt-12 border-t border-line bg-surface py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 id="dir-h" className="mb-3 text-lg font-semibold text-navy">ค้นหาตามทำเลและประเภท</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {DIRECTORY.map(d => (
              <div key={d.title}>
                <h3 className="font-semibold">{d.title}</h3>
                {d.places.map(p => (
                  <Link key={p} href={searchHref(d.base, { q: p })} className="flex min-h-11 items-center text-sm text-muted hover:text-accent hover:underline">{d.title.split(' ')[0]} {p}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer id="site-footer" className="bg-navy pt-8 pb-[calc(28px+env(safe-area-inset-bottom))] text-sm text-navy-muted">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 md:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Logo onDark />
            <p className="mt-1 max-w-[42ch]">เว็บประกาศซื้อ ขาย ให้เช่า บ้าน คอนโด ที่ดิน ใกล้รถไฟฟ้า ทั่วไทย ลงประกาศฟรี</p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold text-white">ค้นหา</h2>
            <Link href={searchHref({ deal: 'sale' })} className="flex min-h-11 items-center hover:text-white">ซื้อ</Link>
            <Link href={searchHref({ deal: 'rent' })} className="flex min-h-11 items-center hover:text-white">เช่า</Link>
            <Link href={searchHref({ deal: 'sale', market: 'new' })} className="flex min-h-11 items-center hover:text-white">โครงการใหม่</Link>
          </div>
          <div>
            <h2 className="mb-1 font-semibold text-white">สำหรับ agent</h2>
            <Link href="/agent/login" className="flex min-h-11 items-center hover:text-white">ลงประกาศ</Link>
            <Link href="/agent/login" className="flex min-h-11 items-center hover:text-white">เข้าสู่ระบบ agent</Link>
          </div>
          <div>
            <h2 className="mb-1 font-semibold text-white">ติดต่อ</h2>
            <a href="mailto:hello@baanhub.example" className="flex min-h-11 items-center hover:text-white">hello@baanhub.example</a>
            <a href="tel:021234567" className="flex min-h-11 items-center hover:text-white">02-123-4567</a>
          </div>
          <p className="col-span-2 border-t border-white/15 pt-4 text-[13px] lg:col-span-4">© 2569 BaanHub · ข้อมูลประกาศในเว็บนี้เป็นข้อมูลตัวอย่าง · นโยบายความเป็นส่วนตัว · ข้อกำหนดการใช้งาน</p>
        </div>
      </footer>
    </>
  );
}
