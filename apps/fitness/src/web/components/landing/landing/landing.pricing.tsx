'use client';

import { BadgePercent, Check } from 'lucide-react';
import { useState } from 'react';
import { BUYOUT_PRICE, formatPrice, RENT_PRICE, type BillingCycle } from '@/api/services/landing/landing/landing.service';
import { pillGhost, pillPrimary } from './landing.styles';

const RENT_FEATURES = ['1 สาขา สมาชิกไม่จำกัด', 'รวมโฮสติ้ง SSL และอัปเดตความปลอดภัย', 'ใช้งานได้ทันที ไม่มีค่าติดตั้ง'];
const BUYOUT_FEATURES = ['สิทธิ์ใช้งานระบบถาวร', 'ไม่จำกัดจำนวนสาขา', 'ปรับสีและโลโก้ตามแบรนด์'];
const BUYOUT_ORIGINAL_PRICE = 79000;
const BUYOUT_DISCOUNT_PERCENT = Math.round((BUYOUT_ORIGINAL_PRICE - BUYOUT_PRICE.amount) / BUYOUT_ORIGINAL_PRICE * 100);

function Features({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2.5 border-t border-line pt-3.5">
      {items.map(f => <li key={f} className="flex gap-2.5 text-[15px]"><Check aria-hidden className="mt-1 size-[18px] shrink-0 text-cyan" />{f}</li>)}
    </ul>
  );
}

/** ราคา: สลับเช่าใช้รายเดือน/รายปี + แบบซื้อขาด */
export function LandingPricing({ chatUrl }: { chatUrl: string | null }) {
  const [cycle, setCycle] = useState<BillingCycle>('month');
  const rent = RENT_PRICE[cycle];
  const chat = (primary: boolean) => chatUrl && (
    <a href={chatUrl} target="_blank" rel="noopener noreferrer" className={`${primary ? pillPrimary : pillGhost} mt-auto min-h-12 px-[22px]`}>ทักแชทสอบถาม</a>
  );

  return (
    <>
      <div data-reveal role="group" aria-label="รอบการจ่าย" className="mt-6 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
        {(['month', 'year'] as const).map(c => (
          <button key={c} type="button" aria-pressed={cycle === c} onClick={() => { setCycle(c); }} className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-[18px] font-display text-[15px] font-semibold text-muted aria-pressed:bg-lime aria-pressed:text-bg">
            {c === 'month' ? 'รายเดือน' : <>รายปี <small className="rounded-full bg-lime/12 px-2 text-[11.5px] text-lime group-aria-pressed:bg-bg/20 group-aria-pressed:text-bg">ฟรี 2 เดือน</small></>}
          </button>
        ))}
      </div>
      <div className="mx-auto mt-10 grid max-w-[880px] gap-[22px] text-left md:grid-cols-2 md:gap-4">
        <article data-reveal className="relative flex flex-col gap-3.5 rounded-[22px] border border-lime bg-surface px-[22px] pt-[26px] pb-[22px] shadow-[0_26px_50px_-32px_var(--color-lime)]">
          {cycle === 'year' && <span className="absolute -top-3.5 left-[22px] rounded-full bg-lime px-3 py-0.5 font-display text-[12.5px] font-semibold text-bg">จ่าย 10 เดือน ได้ 12 เดือน</span>}
          <p className="font-display font-semibold text-muted">เช่าใช้</p>
          {/* เว้นบรรทัดเท่าราคาเดิมของการ์ดซื้อขาด ให้ราคาสองการ์ดอยู่ระดับเดียวกันบนจอกว้าง */}
          <div>
            <p aria-hidden className="hidden text-[15px] md:block">&nbsp;</p>
            <p className="font-display text-[clamp(2.1rem,1.6rem+1.5vw,2.8rem)] leading-tight font-bold" aria-live="polite">{formatPrice(rent.amount)} <small className="font-sans text-[15px] font-medium text-muted">{rent.unit}</small></p>
          </div>
          <p className="min-h-[1.6em] text-sm text-muted">{rent.note}</p>
          <Features items={RENT_FEATURES} />
          {chat(true)}
        </article>
        <article data-reveal className="relative flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface px-[22px] pt-[26px] pb-[22px]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display font-semibold text-muted">ซื้อขาด (ถาวร)</p>
            <span className="-my-1.5 inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 py-1 pr-3 pl-2 font-display text-[13px] font-semibold text-lime">
              <BadgePercent aria-hidden className="size-4" />ลด {String(BUYOUT_DISCOUNT_PERCENT)}%
            </span>
          </div>
          <div>
            <p className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
              <span className="sr-only">ราคาปกติ</span>
              <del className="font-display font-semibold text-faint decoration-lime/70 decoration-2">{formatPrice(BUYOUT_ORIGINAL_PRICE)}</del>
              <span className="font-semibold text-lime">ประหยัด {formatPrice(BUYOUT_ORIGINAL_PRICE - BUYOUT_PRICE.amount)}</span>
            </p>
            <p className="mt-1 font-display text-[clamp(2.1rem,1.6rem+1.5vw,2.8rem)] leading-tight font-extrabold tracking-tight text-lime">{formatPrice(BUYOUT_PRICE.amount)} <small className="font-sans text-[15px] font-medium text-muted">{BUYOUT_PRICE.unit}</small></p>
          </div>
          <p className="min-h-[1.6em] text-sm text-muted">{BUYOUT_PRICE.note}</p>
          <Features items={BUYOUT_FEATURES} />
          {chat(false)}
        </article>
      </div>
    </>
  );
}
