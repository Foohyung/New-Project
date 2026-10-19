import { Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { loginAction } from '@/features/auth/actions';
import { landingFor, safeNextPath } from '@/features/auth/service';
import { getSession } from '@/server/auth';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' };

const FEATURES = ['สมาชิก', 'เช็กอิน QR', 'ตารางคลาส', 'การเงิน', 'การตลาด'];
const BARS = [30, 55, 40, 35, 48, 70, 100, 80, 60, 45];
/* ลาย QR ตัวอย่างบนบัตรที่ลอยอยู่ (ภาพประกอบ ไม่ใช่ QR จริง) */
const QR = '111011100101101110010011110101001110'; // มีแต่ 0/1 จึงแยกทีละตัวอักษรได้

function Brand({ sub }: { sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-bg"><Zap aria-hidden className="size-5" /></span>
      <span className="leading-tight">
        <b className="block font-display text-lg font-bold tracking-[.08em]">FITFLOW</b>
        <small className="text-xs text-muted">{sub}</small>
      </span>
    </div>
  );
}

/** หน้าเข้าสู่ระบบแบบ A2 (designs/login-options.html): ซ้ายโชว์หน้าจอระบบ · ขวาฟอร์ม · มือถือเหลือแถบแบรนด์ + ฟอร์ม */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (session) redirect(landingFor(session.role));
  const next = safeNextPath((await searchParams).next) ?? undefined;

  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ฝั่งแบรนด์ (แท็บเล็ตขึ้นไป) — ภาพประกอบล้วน ไม่มีข้อมูลจริงของยิม */}
      <section aria-hidden className="relative hidden flex-col gap-5 overflow-hidden border-r border-line bg-gradient-to-br from-lime/12 via-surface to-surface p-8 md:flex lg:p-12">
        <Brand sub="ระบบจัดการฟิตเนส" />
        <h2 className="max-w-[calc(100%-150px)] font-display text-3xl leading-tight font-semibold lg:text-4xl">ทุกงานของยิม <span className="text-lime">เริ่มจากตรงนี้</span></h2>
        <ul className="flex max-w-[calc(100%-150px)] flex-wrap gap-2">
          {FEATURES.map(f => <li key={f} className="rounded-full border border-line bg-bg px-3 py-0.5 text-xs text-muted">{f}</li>)}
        </ul>
        {/* ภาพตัวอย่างหน้าระบบ */}
        <div className="absolute right-[-60px] bottom-[-40px] left-8 grid h-[46%] grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-t-2xl border border-line bg-bg lg:left-12">
          <div className="flex flex-col gap-2 border-r border-line bg-surface px-2.5 py-3.5">
            {[true, false, false, false, false, false].map((on, i) => <i key={i} className={`h-2.5 rounded ${on ? 'bg-lime/40' : 'bg-surface-2'}`} />)}
          </div>
          <div className="flex min-w-0 flex-col gap-3 p-4">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`h-14 rounded-lg border p-2 ${i === 0 ? 'border-lime bg-lime' : 'border-line bg-surface'}`}>
                  <b className={`block h-2 w-1/2 rounded ${i === 0 ? 'bg-bg/25' : 'bg-muted/40'}`} />
                  <b className={`mt-2.5 block h-3.5 w-3/4 rounded ${i === 0 ? 'bg-bg/60' : 'bg-ink/70'}`} />
                </div>
              ))}
            </div>
            <div className="flex flex-1 items-end gap-1.5 rounded-xl border border-line bg-surface p-3.5">
              {BARS.map((h, i) => <i key={i} style={{ height: `${String(h)}%` }} className={`flex-1 rounded-t ${i === 7 ? 'bg-lime' : 'bg-muted/30'}`} />)}
            </div>
          </div>
        </div>
        {/* บัตรสมาชิก QR ลอย */}
        <div className="absolute top-28 right-7 w-[120px] rotate-6 rounded-2xl border-4 border-bg bg-lime p-2.5 text-center text-[10px] font-bold text-bg lg:top-32">
          บัตรสมาชิก
          <div className="mx-auto my-1.5 grid size-[78px] grid-cols-6 gap-0.5 rounded-lg bg-white p-1.5">
            {QR.split('').map((b, i) => <i key={i} className={b === '1' ? 'rounded-[1px] bg-[#0B0D10]' : ''} />)}
          </div>
          FF-002318
        </div>
      </section>

      {/* ฟอร์ม */}
      <div className="flex flex-col">
        <div className="p-4 pb-0 md:hidden">
          <div className="rounded-2xl border border-line bg-gradient-to-br from-lime/12 to-surface p-3.5"><Brand sub="ทุกงานของยิมเริ่มจากตรงนี้" /></div>
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
