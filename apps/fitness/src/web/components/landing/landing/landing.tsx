import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { FAQ } from '@/api/services/landing/landing/landing.seo';
import { ArrowRight, Building2, CalendarDays, Check, ChevronDown, Gift, LogIn, MessageCircle, Receipt, ShieldCheck, Users } from 'lucide-react';
import { LogoIcon, PulseMark, Wordmark } from '@/web/components/layout/layout/layout.logo';
import { LandingHeader } from './landing.header';
import { LandingLiveCard } from './landing.live-card';
import { LandingPricing } from './landing.pricing';
import { LandingReveal } from './landing.reveal';
import { pillGhost, pillPrimary } from './landing.styles';

/** คำที่ห้ามตัดกลางบรรทัด (เบราว์เซอร์ตัดคำไทยที่ไม่อยู่ในพจนานุกรมผิด เช่น "เช็ / กอิน") */
const Nw = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap">{children}</span>;

const wrap = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8';
const section = 'scroll-mt-20 py-16 md:py-24';
const h2 = 'mt-3 font-display text-[clamp(1.875rem,1.25rem+2.6vw,3rem)] leading-[1.28] font-bold tracking-[-.01em] text-balance';
const lead = 'mt-3.5 max-w-[62ch] text-[17px] text-muted text-pretty';
const cardShadow = 'shadow-[0_30px_60px_-30px_color-mix(in_oklab,var(--color-ink)_30%,transparent)]';
const textLink = 'font-semibold text-ink underline underline-offset-[3px]';
/** ลำดับการลอยเข้าของ hero ตอนเปิดหน้า (ff-hero-in ใน globals.css) */
const heroStep = (i: number): CSSProperties => ({ '--ff-i': i } as CSSProperties);

function Kicker({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p style={style} className={`inline-flex items-center gap-2 font-display text-[13px] font-semibold tracking-[.04em] text-lime ${className}`}>
      <span className="size-[7px] rounded-full bg-current shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-lime)_12%,transparent)]" />{children}
    </p>
  );
}

const Badge = ({ tone, children }: { tone: 'ok' | 'bad' | 'warn'; children: ReactNode }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tone === 'ok' ? 'bg-cyan/15 text-cyan' : tone === 'bad' ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'}`}>{children}</span>
);

/** แถวรายชื่อสมาชิกในภาพประกอบ: อักษรย่อ · ชื่อ/รายละเอียด · ป้ายสถานะ */
function Row({ initial, name, sub, badge, risk }: { initial: string; name: string; sub: string; badge: ReactNode; risk?: { width: string; danger?: boolean } }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 border-t border-line py-2.5 first:border-t-0">
      <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-lime/12 font-display text-[13.5px] font-semibold text-lime">{initial}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate font-display text-sm font-semibold">{name}</b>
        <small className="block truncate text-[12.5px] text-muted">{sub}</small>
        {risk && <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2"><i className={`block h-full rounded-full ${risk.danger ? 'bg-danger' : 'bg-warn'}`} style={{ width: risk.width }} /></span>}
      </span>
      {badge}
    </li>
  );
}

const PanelHead = ({ title, note }: { title: ReactNode; note: string }) => (
  <p className="flex items-center justify-between gap-2 font-display text-[14.5px] font-semibold"><span>{title}</span><small className="font-sans text-[12.5px] font-normal text-muted">{note}</small></p>
);

function FeatureRow({ no, title, desc, checks, visual, flip = false }: { no: ReactNode; title: ReactNode; desc: string; checks: ReactNode[]; visual: ReactNode; flip?: boolean }) {
  return (
    <div data-reveal className="grid items-center gap-6 border-line py-7 not-first:border-t lg:grid-cols-2 lg:gap-16 lg:py-11">
      <div>
        <p className="font-display text-[13px] font-semibold tracking-[.06em] text-lime">{no}</p>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,1.15rem+1.4vw,2.1rem)] leading-[1.3] font-bold">{title}</h3>
        <p className="mt-2.5 text-[16.5px] text-muted">{desc}</p>
        <ul className="mt-4 grid gap-2.5">
          {checks.map((t, i) => <li key={i} className="flex gap-2.5 text-[15.5px]"><Check aria-hidden className="mt-1 size-[18px] shrink-0 text-lime" /><span>{t}</span></li>)}
        </ul>
      </div>
      <div className={`rounded-[20px] border border-line bg-surface p-4 ${cardShadow} ${flip ? 'lg:-order-1' : ''}`}>{visual}</div>
    </div>
  );
}

const MORE = [
  { icon: Users, title: 'สมาชิกและแพ็กเกจ', desc: <>สมัคร <Nw>ต่ออายุ</Nw> พักสมาชิก ดูได้ 3 มุมมอง ตั้งแพ็กเกจรายเดือน รายครั้ง หรือครึ่งเดือนได้เอง</>, tags: ['พักสมาชิก', 'รายครั้ง', 'ครึ่งเดือน'] },
  { icon: CalendarDays, title: 'คลาส คอร์ส และเทรนเนอร์', desc: 'ตารางคลาส จองที่นั่งล่วงหน้า และคอร์สเรียนรายคนกับเทรนเนอร์', tags: ['ตารางคลาส', 'จองคลาส', 'คอร์สเรียน'] },
  { icon: Receipt, title: 'การเงินและขายหน้าร้าน', desc: 'รับเงิน ขายสินค้าหน้าร้าน ใบเสร็จ A4 แยก VAT พิมพ์ได้ทันที', tags: ['ใบเสร็จ A4', 'POS', 'สต็อกสินค้า'] },
  { icon: Gift, title: 'คูปองและโค้ดชวนเพื่อน', desc: 'ตั้งเงื่อนไขคูปองเอง และให้สมาชิกชวนเพื่อนมาสมัคร', tags: ['คูปอง', 'โค้ดชวนเพื่อน'] },
  { icon: Building2, title: 'หลายสาขา', desc: 'แยกข้อมูลและรายงานตามสาขา เจ้าของดูรวมทุกสาขาได้ในที่เดียว', tags: ['แยกสาขา', 'รายงานรวม'] },
  { icon: ShieldCheck, title: 'สิทธิ์ตามตำแหน่ง', desc: 'เจ้าของ ผู้จัดการ เคาน์เตอร์ เทรนเนอร์ และสมาชิก เห็นเฉพาะที่ต้องใช้', tags: ['5 ตำแหน่ง', 'ประวัติเข้าระบบ'] },
];

const STEPS = [
  { title: 'ตั้งค่ายิม', desc: 'สาขา แพ็กเกจ โลโก้ และสีแบรนด์ เลือกธีมได้ 4 แบบ ทั้งโหมดสว่างและมืด' },
  { title: 'เพิ่มทีมและสมาชิก', desc: 'เจ้าของ ผู้จัดการ เคาน์เตอร์ และเทรนเนอร์ ได้สิทธิ์ตามตำแหน่งของตัวเอง' },
  { title: <>เริ่ม<Nw>เช็กอิน</Nw></>, desc: 'สมาชิกเข้าระบบด้วยเบอร์โทร เปิดบัตร QR แล้วแสดงที่เคาน์เตอร์ได้เลย' },
];

/**
 * หน้าแรกก่อนเข้าสู่ระบบ (mockup แบบ D)
 * hero + การ์ดเช็กอินสด · ฟีเจอร์ · 3 ขั้นตอน · ราคา · ปิดท้าย — ปุ่มหลักคือ "เข้าสู่ระบบ"
 * `chatUrl` = ลิงก์แชทจาก env LANDING_CHAT_URL (ไม่มี = ซ่อนปุ่มทักแชททั้งหมด)
 */
export function LandingPage({ chatUrl }: { chatUrl: string | null }) {
  const chatLink = (className: string, children: ReactNode) => chatUrl && (
    <a href={chatUrl} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  );

  return (
    <div className="min-h-dvh bg-surface">
      <LandingHeader chatUrl={chatUrl} />
      <LandingReveal />
      <main id="top">
        {/* ff-static: ไม่ใช้แอนิเมชัน "พุ่งเข้าจากซ้าย" ของหน้าในระบบ (ทำให้เกิด scroll แนวนอนตอนโหลด) */}
        <div className="ff-static">
          {/* ===== Hero ===== */}
          <section aria-labelledby="hero-title" className="relative overflow-hidden pt-10 pb-16 lg:pt-[72px] lg:pb-24">
            <div aria-hidden className="ff-drift pointer-events-none absolute -top-[10%] -right-[20%] h-[90%] w-[80%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-lime)_13%,transparent),transparent)]" />
            <div className={`${wrap} relative grid items-center gap-11 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:gap-14`}>
              <div>
                <Kicker className="ff-hero-in" style={heroStep(0)}>ระบบจัดการฟิตเนส · สำหรับเจ้าของยิม</Kicker>
                <h1 id="hero-title" className="mt-[18px] font-display text-[clamp(2.25rem,1.3rem+5vw,4.5rem)] leading-[1.2] font-bold tracking-[-.015em]">
                  <span className="ff-hero-in block text-balance" style={heroStep(1)}>ระบบจัดการฟิตเนส</span>
                  <span className="ff-hero-in block text-balance text-lime" style={heroStep(2)}>ครบในที่เดียว</span>
                </h1>
                <p className={`ff-hero-in ${lead} mt-[22px] md:text-[19px]`} style={heroStep(3)}>
                  สมาชิก <Nw>เช็กอิน QR</Nw> คลาส การเงิน และ<Nw>การตลาด</Nw>ในระบบเดียว — ระบบเตือน<Nw>ต่ออายุ</Nw>และบอกว่าใครกำลังจะหลุด ให้สมาชิกอยู่นานขึ้นโดยทีมไม่ต้องทำงานเพิ่ม
                </p>
                <div className="ff-hero-in mt-7 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3" style={heroStep(4)}>
                  <Link href="/login" className={`${pillPrimary} min-h-[54px] px-[26px] text-[17px]`}><LogIn aria-hidden className="size-5" />เข้าสู่ระบบ</Link>
                  {chatLink(`${pillGhost} min-h-[54px] px-[26px] text-[17px]`, <>ทักแชทสอบถาม<ArrowRight aria-hidden className="size-5" /></>)}
                </div>
                <p className="ff-hero-in mt-[18px] text-sm text-muted" style={heroStep(5)}>
                  <a href="#features" className={textLink}>ฟีเจอร์</a> · <a href="#how" className={textLink}>เริ่มใช้งาน 3 ขั้นตอน</a> · <a href="#pricing" className={textLink}>ราคา</a>
                </p>
                <p className="ff-hero-in mt-4 flex max-w-[58ch] gap-2.5 text-sm text-muted" style={heroStep(6)}>
                  <ShieldCheck aria-hidden className="mt-0.5 size-[18px] shrink-0 text-cyan" />
                  <span>พนักงานเข้าสู่ระบบด้วยอีเมล สมาชิกเข้าด้วยเบอร์โทร — ใช้หน้าเดียวกัน แล้วระบบพาไปหน้าของแต่ละตำแหน่งเอง</span>
                </p>
              </div>
              <div className="ff-hero-card"><LandingLiveCard /></div>
            </div>
          </section>

          {/* ===== ฟีเจอร์ ===== */}
          <section id="features" aria-labelledby="features-title" className={`${section} bg-bg`}>
            <div className={wrap}>
              <div data-reveal className="text-center">
                <Kicker>ฟีเจอร์ / งานที่ระบบรับช่วง</Kicker>
                <h2 id="features-title" className={h2}>
                  <span className="block text-balance">ให้ทีมใช้เวลากับคนในยิม</span><span className="block text-balance text-lime">ไม่ใช่กับงานซ้ำ ๆ</span>
                </h2>
              </div>

              <FeatureRow
                no={<>01 · <Nw>เช็กอิน</Nw></>}
                title={<><Nw>เช็กอิน</Nw>ที่ไม่ต้องเปิดดูแพ็กเกจ</>}
                desc="สมาชิกเปิดบัตร QR ในมือถือ เคาน์เตอร์สแกนครั้งเดียว ระบบตรวจวันหมดอายุและจำนวนครั้งที่เหลือให้เอง"
                checks={[<>ปฏิเสธเองเมื่อหมดอายุ พร้อมปุ่ม<Nw>ต่ออายุ</Nw></>, 'พิมพ์เบอร์โทรแทนได้เมื่อลืมมือถือ']}
                visual={<>
                  <PanelHead title={<>บันทึก<Nw>เช็กอิน</Nw></>} note="วันนี้ 47 คน" />
                  <ul className="mt-2">
                    <Row initial="ป" name="คุณปิยะ" sub="รายเดือน · เหลือ 30 วัน" badge={<Badge tone="ok">ผ่าน</Badge>} />
                    <Row initial="ม" name="คุณมายด์" sub="10 ครั้ง · เหลือ 4 ครั้ง" badge={<Badge tone="ok">ผ่าน</Badge>} />
                    <Row initial="ต" name="คุณต้น" sub="หมดอายุเมื่อวาน" badge={<Badge tone="bad">ปฏิเสธ</Badge>} />
                  </ul>
                </>}
              />
              <FeatureRow
                flip
                no={<>02 · <Nw>ต่ออายุ</Nw></>}
                title={<>เตือน<Nw>ต่ออายุ</Nw>ก่อนสมาชิกจะลืม</>}
                desc="ตั้งรอบเตือนครั้งเดียว ระบบส่งทาง LINE/SMS พร้อมลิงก์จ่าย และใช้คูปองหรือโค้ดชวนเพื่อนดึงคนกลับมาได้"
                checks={['ส่งเองตามรอบ ไม่ต้องไล่ทักทีละคน', 'คูปองส่วนลดและโค้ดชวนเพื่อน']}
                visual={<>
                  <div className="flex items-center gap-2.5 border-b border-line pb-3">
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-lime/12 font-display text-[13.5px] font-semibold text-lime">F</span>
                    <span className="min-w-0"><b className="block font-display text-sm font-semibold">FitFlow สาขาสยาม</b><small className="block text-[12.5px] text-muted">ข้อความอัตโนมัติ · LINE</small></span>
                  </div>
                  <div className="mt-3.5 max-w-[300px] rounded-2xl rounded-bl-[4px] bg-surface-2 px-3.5 py-3 text-[14.5px]">
                    สวัสดีคุณแนน แพ็กเกจรายเดือนจะหมดอายุในอีก 3 วัน (5 พ.ย. 69)
                    <span className="mt-2 flex w-fit rounded-[10px] bg-lime px-3 py-1.5 font-display text-[13px] font-semibold text-bg">ต่ออายุ ฿1,500</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-cyan/10 px-3 py-2.5 text-sm font-semibold text-cyan">
                    <Check aria-hidden className="size-5 shrink-0" /><span>คุณแนนจ่ายแล้ว · <Nw>ต่ออายุ</Nw>ถึง 5 ธ.ค. 69</span>
                  </p>
                </>}
              />
              <FeatureRow
                no="03 · รักษาสมาชิก"
                title="รู้ก่อนว่าใครกำลังจะหลุด"
                desc="ระบบจับสมาชิกที่เริ่มหายไปจากยิม แล้วจัดลำดับให้ทีมโทรตามคนที่เสี่ยงที่สุดก่อน"
                checks={[<>ดูจากความถี่การ<Nw>เช็กอิน</Nw>จริง</>, 'บันทึกผลการโทรตามได้ในระบบ']}
                visual={<>
                  <PanelHead title="สมาชิกเสี่ยงหลุด" note="ต้องโทรตาม 3 คน" />
                  <ul className="mt-2">
                    <Row initial="บ" name="คุณบีม" sub="ไม่มา 14 วัน" risk={{ width: '88%', danger: true }} badge={<Badge tone="bad">เสี่ยงสูง</Badge>} />
                    <Row initial="ก" name="คุณกิ๊ฟ" sub="ไม่มา 9 วัน" risk={{ width: '62%' }} badge={<Badge tone="warn">เฝ้าดู</Badge>} />
                    <Row initial="อ" name="คุณโอ๊ต" sub="มาน้อยลงครึ่งหนึ่ง" risk={{ width: '45%' }} badge={<Badge tone="warn">เฝ้าดู</Badge>} />
                  </ul>
                </>}
              />

              <div className="mt-10 border-t border-line pt-10">
                <p data-reveal className="text-center font-display text-lg font-semibold">และอีกครบในระบบเดียว</p>
                <div className="mt-[22px] grid gap-3.5 md:grid-cols-2 md:gap-[18px] lg:grid-cols-3">
                  {MORE.map((f, i) => (
                    <article key={f.title} data-reveal className="flex flex-col rounded-[20px] border border-line bg-surface p-[22px] transition hover:-translate-y-[3px] hover:border-lime/40">
                      <div className="flex items-start justify-between">
                        <span className="grid size-[46px] place-items-center rounded-[13px] bg-lime/12 text-lime"><f.icon aria-hidden className="size-5" /></span>
                        <span className="font-display text-[13px] font-semibold text-muted">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="mt-[18px] font-display text-[19px] leading-snug font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-[15.5px] text-muted">{f.desc}</p>
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-3.5">
                        {f.tags.map(t => <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12.5px] font-semibold text-muted">{t}</span>)}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ===== 3 ขั้นตอน ===== */}
          <section id="how" aria-labelledby="how-title" className={section}>
            <div className={wrap}>
              <div data-reveal className="text-center">
                <Kicker>เริ่มใช้งาน 3 ขั้นตอน</Kicker>
                <h2 id="how-title" className={h2}>ตั้งค่าครั้งเดียว <span className="text-lime">ทั้งยิมใช้ได้ทันที</span></h2>
                <p className={`${lead} mx-auto`}>ทุกตำแหน่งเข้าที่เดียวกัน และเห็นเฉพาะเมนูที่ต้องใช้</p>
              </div>
              <ol className="mt-9 grid gap-3.5 md:grid-cols-3 md:gap-[18px]">
                {STEPS.map((s, i) => (
                  <li key={i} data-reveal className="rounded-[20px] border border-line bg-surface p-[22px]">
                    <div className="flex items-center gap-3">
                      <b className="grid size-[38px] place-items-center rounded-full bg-lime/12 font-display text-sm font-bold text-lime">{String(i + 1).padStart(2, '0')}</b>
                      <i className="h-px flex-1 bg-line" />
                    </div>
                    <h3 className="mt-[18px] font-display text-lg leading-snug font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[15.5px] text-muted">{s.desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ===== ราคา ===== */}
          <section id="pricing" aria-labelledby="pricing-title" className={`${section} bg-bg`}>
            <div className={`${wrap} text-center`}>
              <div data-reveal>
              <Kicker>ราคา</Kicker>
              <h2 id="pricing-title" className={h2}>
                <span className="block text-balance">เลือกจ่ายแบบที่ยิมสะดวก</span><span className="block text-balance text-lime">สมาชิกไม่จำกัด</span>
              </h2>
              </div>
              <LandingPricing chatUrl={chatUrl} />
            </div>
          </section>

          {/* ===== คำถามที่พบบ่อย (ข้อความเดียวกับ FAQPage ใน JSON-LD) ===== */}
          <section id="faq" aria-labelledby="faq-title" className={section}>
            <div className={`${wrap} max-w-[860px]`}>
              <div data-reveal className="text-center">
                <Kicker>คำถามที่พบบ่อย</Kicker>
                <h2 id="faq-title" className={h2}>สงสัยอะไร <span className="text-lime">ตอบไว้ตรงนี้</span></h2>
              </div>
              <div className="mt-9 grid gap-3">
                {FAQ.map((f, i) => (
                  <details key={f.q} data-reveal open={i === 0} className="group rounded-[18px] border border-line bg-surface px-5 open:border-lime/40">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                      <h3>{f.q}</h3>
                      <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition group-open:rotate-180 group-open:text-lime" />
                    </summary>
                    <p className="pb-5 text-[15.5px] text-muted text-pretty">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ===== ปิดท้าย ===== */}
          <section id="contact" aria-labelledby="contact-title" className={`${section} relative overflow-hidden text-center`}>
            <div aria-hidden className="pointer-events-none absolute -bottom-1/2 left-1/2 h-full w-[110%] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-lime)_12%,transparent),transparent)]" />
            <div data-reveal className={`${wrap} relative`}>
              <span className="mx-auto grid size-[58px] place-items-center rounded-[17px] bg-lime/12 text-lime"><PulseMark className="size-[34px]" /></span>
              <h2 id="contact-title" className={h2}>
                <span className="block text-balance">พร้อมให้ยิมเดินเองได้</span><span className="block text-balance text-lime">เริ่มจากหน้านี้</span>
              </h2>
              <p className={`${lead} mx-auto`}>{chatUrl ? 'มีบัญชีแล้วเข้าสู่ระบบได้เลย ยังไม่มีทักแชทขอดูระบบจริงได้' : 'มีบัญชีแล้วเข้าสู่ระบบได้เลย'}</p>
              <div className="mt-7 grid gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
                <Link href="/login" className={`${pillPrimary} min-h-[54px] px-[26px] text-[17px]`}><LogIn aria-hidden className="size-5" />เข้าสู่ระบบ</Link>
                {chatLink(`${pillGhost} min-h-[54px] px-[26px] text-[17px]`, <><MessageCircle aria-hidden className="size-5" />ทักแชทสอบถาม</>)}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-line bg-surface pt-11 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <div className={wrap}>
          <div className="grid gap-7 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <a href="#top" aria-label="FitFlow กลับขึ้นด้านบน" className="flex min-h-11 w-fit items-center gap-2.5">
                <LogoIcon className="size-[38px] rounded-[11px]" />
                <Wordmark className="text-lg" />
              </a>
              <p className="mt-3.5 max-w-[42ch] text-[14.5px] text-muted">ระบบจัดการฟิตเนส: สมาชิก <Nw>เช็กอิน</Nw> คลาส เทรนเนอร์ การเงิน และรายงาน ในระบบเดียว</p>
            </div>
            <nav aria-label="ระบบ">
              <h3 className="font-display text-sm font-semibold text-muted">ระบบ</h3>
              <ul className="mt-1.5">
                {[['#features', 'ฟีเจอร์'], ['#how', 'เริ่มใช้งาน'], ['#pricing', 'ราคา'], ['#faq', 'คำถามที่พบบ่อย']].map(([href, label]) => <li key={href}><a href={href} className="flex min-h-11 items-center text-[15px] hover:text-lime">{label}</a></li>)}
              </ul>
            </nav>
            <nav aria-label="บัญชีผู้ใช้">
              <h3 className="font-display text-sm font-semibold text-muted">บัญชีผู้ใช้</h3>
              <ul className="mt-1.5">
                <li><Link href="/login" className="flex min-h-11 items-center text-[15px] hover:text-lime">เข้าสู่ระบบ</Link></li>
                <li><Link href="/forgot-password" className="flex min-h-11 items-center text-[15px] hover:text-lime">ลืมรหัสผ่าน</Link></li>
                <li><a href="#contact" className="flex min-h-11 items-center text-[15px] hover:text-lime">ติดต่อเรา</a></li>
              </ul>
            </nav>
          </div>
          <div className="mt-7 flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-line pt-[18px] text-[13.5px] text-muted">
            <span>© 2569 FitFlow</span><span>ใช้ได้ทุกอุปกรณ์ · เลือกธีมได้ 4 แบบ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
