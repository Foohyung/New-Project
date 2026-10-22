import type { Metadata } from 'next';
import { Kanit } from 'next/font/google';
import { redirect } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { LoginForm } from '@/components/login-form';
import { LogoIcon, PulseMark, Wordmark } from '@/components/logo';
import { loginAction } from '@/features/auth/actions';
import { landingFor, safeNextPath } from '@/features/auth/service';
import { getSession } from '@/server/auth';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' };

/* ตัวหนาเอียงสำหรับคำใหญ่แบบแบรนด์กีฬา — โหลดเฉพาะหน้านี้ */
const athletic = Kanit({ subsets: ['latin'], weight: '800', style: 'italic', display: 'swap' });

const FEATURES = ['สมาชิก', 'เช็กอิน QR', 'คลาส', 'การเงิน'];
const TASKS = ['เช็กอิน', 'จองคลาส', 'รับเงิน', 'ต่ออายุ', 'จบในที่เดียว'];

/** วลีไทยที่ห้ามตัดกลางคำ (เบราว์เซอร์ตัดคำที่ไม่อยู่ในพจนานุกรมผิด เช่น "เช็ / กอิน") */
function Phrase({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/* แถบเฉียงแบบลายชุดกีฬา (สีพื้นหลังของธีม บนแผงสีหลัก) */
const STRIPES = 'bg-[repeating-linear-gradient(90deg,var(--color-bg)_0_26px,transparent_26px_58px)]';

function Brand({ sub, inverse = false }: { sub: string; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon className="size-11 rounded-xl" inverse={inverse} />
      <span className="leading-tight">
        <Wordmark className="block text-xl" inverse={inverse} />
        <small className={`text-xs ${inverse ? 'text-bg/75' : 'text-muted'}`}>{sub}</small>
      </span>
    </div>
  );
}

/** คำใหญ่ MOVE. TRAIN. REPEAT. — ตัวโปร่ง · ตัวทึบ · ตัวกลับสีในกล่อง */
function Words({ size, short = false }: { size: string; short?: boolean }) {
  return (
    <p aria-hidden className={`${athletic.className} flex flex-col items-start uppercase leading-[.86] tracking-[-.02em] ${size}`}>
      <span className="text-transparent [-webkit-text-stroke:2px_var(--color-bg)]">Move.</span>
      <span>Train.</span>
      {!short && <span className="mt-2 -ml-1 bg-bg px-3 pb-1 text-lime">Repeat.</span>}
    </p>
  );
}

/** หน้าเข้าสู่ระบบแบบ B2 + แผงแบรนด์: ซ้ายเป็นแผงสีหลักของธีม (โลโก้ คำใหญ่ แถบเฉียง) · ขวาเป็นฟอร์ม · มือถือเป็นแถบแบรนด์ด้านบน */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (session) redirect(landingFor(session.role));
  const next = safeNextPath((await searchParams).next) ?? undefined;

  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* แผงแบรนด์ (แท็บเล็ตขึ้นไป) */}
      <section aria-label="FitFlow ระบบจัดการฟิตเนส" className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-lime p-10 text-bg md:flex lg:p-14">
        <div aria-hidden className={`pointer-events-none absolute -top-24 -right-36 h-[150%] w-[460px] rotate-[28deg] opacity-[.12] ${STRIPES} [mask-image:linear-gradient(to_bottom,#000_45%,transparent_90%)]`} />
        {/* เส้นชีพจรของโลโก้เป็นลายน้ำ */}
        <PulseMark strokeWidth={4} className="pointer-events-none absolute top-1/2 -right-24 size-[480px] -translate-y-1/2 text-bg/[.09]" />
        <div className="relative"><Brand sub="สาขาอารีย์" inverse /></div>
        <Words size="text-[clamp(64px,8.2vw,124px)] relative" />
        <div className="relative flex max-w-xl flex-col gap-4">
          <p className="text-base text-pretty text-bg/80">
            <b className="font-semibold text-bg"><Phrase>ระบบหลังบ้านของยิม</Phrase> <Phrase>ที่เร็วพอ ๆ กับคนในยิม</Phrase></b> — {TASKS.map(t => <Fragment key={t}><Phrase>{t}</Phrase> </Fragment>)}
          </p>
          <ul className="flex flex-wrap gap-2">
            {FEATURES.map((f, i) => (
              <li key={f} className="rounded-md bg-bg px-3 py-1 font-display text-sm font-semibold text-ink"><span className="mr-1.5 text-lime">{String(i + 1).padStart(2, '0')}</span>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ฟอร์ม */}
      <div className="flex min-w-0 flex-col">
        <div className="px-4 pt-4 md:hidden">
          <div className="relative overflow-hidden rounded-2xl bg-lime p-4 text-bg">
            <div aria-hidden className={`pointer-events-none absolute -top-10 -right-20 h-[260px] w-[200px] rotate-[28deg] opacity-[.12] ${STRIPES}`} />
            <div className="relative"><Brand sub="สาขาอารีย์" inverse /></div>
            <Words size="relative mt-3 text-[44px]" short />
          </div>
        </div>
        <div className="grid flex-1 items-start justify-items-center px-4 py-8 sm:px-8 md:items-center">
          <div className="flex w-full max-w-[380px] flex-col gap-5">
            <div>
              <h1 className="font-display text-[28px] leading-tight font-semibold">เข้าสู่ระบบ</h1>
              <p className="text-sm text-muted">ระบบจะพาไปหน้าที่ตรงกับตำแหน่งของคุณเอง</p>
            </div>
            <LoginForm action={loginAction} next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}
