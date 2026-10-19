import { Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { loginAction } from '@/features/auth/actions';
import { landingFor, safeNextPath } from '@/features/auth/service';
import { getSession } from '@/server/auth';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' };

const CLASSES = [
  { time: '18:00', name: 'HIIT Burn', detail: 'โค้ชบอส · ห้อง A', attendance: '24/25' },
  { time: '19:00', name: 'Yoga Flow', detail: 'ครูแพร · ห้อง B', attendance: '12/20' },
  { time: '20:00', name: 'Spin Power', detail: 'โค้ชเจ · ห้อง Spin', attendance: 'เต็ม' },
];

function Brand({ sub, inverse = false }: { sub: string; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${inverse ? 'text-bg' : ''}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${inverse ? 'bg-bg text-lime' : 'bg-lime text-bg'}`}><Zap aria-hidden className="size-5" /></span>
      <span className="leading-tight">
        <b className="block font-display text-lg font-bold tracking-[.08em]">FITFLOW</b>
        <small className={`text-xs ${inverse ? 'text-bg/70' : 'text-muted'}`}>{sub}</small>
      </span>
    </div>
  );
}

/** หน้าเข้าสู่ระบบแบบ A3 สลับข้าง: ซ้ายเป็นแผงแบรนด์ · ขวาเป็นฟอร์ม */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (session) redirect(landingFor(session.role));
  const next = safeNextPath((await searchParams).next) ?? undefined;

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section aria-label="ตัวอย่างคลาสวันนี้" className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-lime p-6 text-bg sm:p-8 md:flex lg:p-12">
        <div aria-hidden className="pointer-events-none absolute right-[-90px] bottom-[-110px] size-[360px] rounded-full border-[50px] border-bg/10" />
        <div className="relative z-10"><Brand sub="สาขาอารีย์" inverse /></div>
        <div className="relative z-10 max-w-sm">
          <h2 className="font-display text-4xl leading-tight font-semibold lg:text-5xl">พร้อมลุย<br />อีกวันแล้ว</h2>
          <p className="mt-2 text-sm text-bg/75">เข้าสู่ระบบเพื่อเช็กอินสมาชิก จัดคลาส และดูยอดของวันนี้</p>
        </div>
        <div className="relative z-10 rounded-2xl bg-bg p-4 text-ink">
          <h3 className="flex items-center justify-between gap-3 text-sm font-semibold text-muted"><span>คลาสถัดไปวันนี้</span><span className="shrink-0 text-xs font-normal">พฤ. 15 ต.ค.</span></h3>
          <ul className="mt-2 divide-y divide-line">
            {CLASSES.map((item, index) => (
              <li key={item.time} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 py-2 text-sm">
                <time className="font-display font-semibold text-lime">{item.time}</time>
                <span className="min-w-0">{item.name}<small className="block truncate text-xs text-muted">{item.detail}</small></span>
                <span className={`rounded-full px-2 text-[11px] font-semibold ${index === CLASSES.length - 1 ? 'bg-danger/15 text-danger' : 'bg-lime/15 text-lime'}`}>{item.attendance}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex min-w-0 flex-col">
        <div className="px-4 pt-4 md:hidden">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-lime p-3.5 text-bg">
            <span><b className="block font-display text-lg font-semibold">พร้อมลุยอีกวันแล้ว</b><small className="text-xs text-bg/75">FitFlow · สาขาอารีย์</small></span>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg text-lime"><Zap aria-hidden className="size-5" /></span>
          </div>
        </div>
        <div className="grid flex-1 items-start justify-items-center px-4 py-8 sm:px-8 md:items-center">
          <div className="flex w-full max-w-[380px] flex-col gap-5">
            <div className="hidden md:block"><Brand sub="สาขาอารีย์" /></div>
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
