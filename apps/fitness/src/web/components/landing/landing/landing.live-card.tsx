'use client';

import { CalendarCheck, Check, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkInSteps, DEMO_CHECKINS, type StepState } from '@/api/services/landing/landing/landing.service';
import { PulseMark } from '@/web/components/layout/layout/layout.logo';

const ACTIVE = ['กำลังสแกน', 'กำลังตรวจ', 'กำลังบันทึก'];
const STEP_STYLE: Record<StepState, { icon: string; label: string }> = {
  done: { icon: 'bg-cyan/15 text-cyan', label: 'text-cyan' },
  active: { icon: 'bg-lime text-bg shadow-[0_10px_22px_-10px_var(--color-lime)]', label: 'text-lime' },
  wait: { icon: 'bg-surface-2 text-muted', label: 'text-muted' },
  denied: { icon: 'bg-danger/15 text-danger', label: 'text-danger' },
};

/** การ์ดจำลองการเช็กอินหน้าเคาน์เตอร์ วนสมาชิกทีละคน: สแกน → ตรวจแพ็กเกจ → บันทึกเข้าใช้ (คนหมดอายุถูกปฏิเสธ) */
export function LandingLiveCard() {
  const [{ member, step, count }, setState] = useState({ member: 0, step: 1, count: 47 });

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let cur = { member: 0, step: 1, count: 47 };
    const tick = () => {
      const ok = DEMO_CHECKINS[cur.member]?.ok ?? true;
      let delay = 1200;
      if (cur.step < 3 && !(cur.step === 2 && !ok)) {
        cur = { ...cur, step: cur.step + 1, count: cur.step + 1 === 3 ? cur.count + 1 : cur.count };
        if (cur.step === 3) delay = 1900;
      } else if (cur.step === 2) {
        cur = { ...cur, step: 3 };
        delay = 2200;
      } else {
        cur = { ...cur, member: (cur.member + 1) % DEMO_CHECKINS.length, step: 0 };
        delay = 1100;
      }
      setState(cur);
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 1400);
    return () => { clearTimeout(timer); };
  }, []);

  const m = DEMO_CHECKINS[member] ?? DEMO_CHECKINS[0];
  const states = checkInSteps(step, m.ok);
  const denied = !m.ok && step > 1;
  const labels = states.map((s, i) => (s === 'denied' ? (i === 1 ? 'หมดอายุ' : 'ไม่ผ่าน') : s === 'done' ? 'เสร็จแล้ว' : s === 'active' ? ACTIVE[i] : 'รอคิว'));
  const steps = [
    { icon: QrCode, title: 'สแกน QR สมาชิก', sub: `${m.name} · ${m.id}` },
    { icon: CalendarCheck, title: 'ตรวจแพ็กเกจและวันหมดอายุ', sub: m.pkg },
    { icon: Check, title: 'บันทึกเข้าใช้', sub: denied ? 'ไม่บันทึก · เสนอต่ออายุให้พนักงาน' : `${m.time} น. · สาขาสยาม` },
  ];

  return (
    <div aria-label="ตัวอย่างการเช็กอินหน้าเคาน์เตอร์" role="img" className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_30px_60px_-30px_color-mix(in_oklab,var(--color-ink)_30%,transparent)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-[18px] py-4">
        <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-lime/12 text-lime"><PulseMark className="size-[30px]" /></span>
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[.16em] text-muted">FITFLOW · เคาน์เตอร์</p>
          <p className="font-display text-[15px] font-semibold"><span className="whitespace-nowrap">เช็กอิน</span>หน้าเคาน์เตอร์</p>
        </div>
        <p className={`ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${denied ? 'text-danger' : 'text-cyan'}`}>
          <i className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
          {denied ? 'ปฏิเสธ · หมดอายุ' : step >= 3 ? 'เข้าใช้แล้ว' : 'กำลังเช็กอิน'}
        </p>
      </div>
      <div className="px-[18px] pt-5 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[12.5px] font-semibold text-lime">งานที่ระบบทำให้</p>
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[13px] font-semibold whitespace-nowrap">3 ขั้นตอน</span>
        </div>
        <p className="mt-2.5 font-display text-[clamp(1.5rem,1.15rem+1.5vw,2rem)] leading-[1.3] font-bold">
          <span className="block">สแกนครั้งเดียว</span><span className="block text-lime">ระบบตรวจที่เหลือ</span>
        </p>
        <p className="mt-2 text-[14.5px] text-muted">พนักงานไม่ต้องเปิดดูแพ็กเกจทีละคน</p>
        <ol className="mt-[18px]">
          {steps.map((s, i) => {
            const state = states[i] ?? 'wait';
            return (
              <li key={s.title} className="flex items-center gap-3 border-t border-line py-3.5">
                <span className={`grid size-[42px] shrink-0 place-items-center rounded-xl transition ${STEP_STYLE[state].icon}`}><s.icon aria-hidden className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block font-display text-[15px] leading-snug font-semibold">{s.title}</b>
                  <small className="block text-[13px] text-muted">{s.sub}</small>
                </span>
                <span className={`text-[12.5px] font-semibold whitespace-nowrap ${STEP_STYLE[state].label}`}>{labels[i]}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-[18px] py-3.5">
        <div>
          <b className="block font-display text-sm font-semibold">หมดอายุ? ระบบปฏิเสธเอง</b>
          <small className="block text-[12.5px] text-muted">พร้อมปุ่ม<span className="whitespace-nowrap">ต่ออายุ</span>ให้พนักงาน</small>
        </div>
        <div className="grid max-w-[220px] min-w-[140px] flex-1 justify-items-end gap-1.5">
          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line"><i className="block h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${Math.min(count, 100)}%` }} /></span>
          <small className="text-[12.5px] text-muted"><span className="whitespace-nowrap">เช็กอิน</span>วันนี้ <b className="text-ink">{count}</b> คน</small>
        </div>
      </div>
    </div>
  );
}
