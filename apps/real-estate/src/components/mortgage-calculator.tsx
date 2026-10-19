'use client';

import { formatBaht } from '@repo/utils';
import { useId, useState } from 'react';
import { DEFAULT_TERMS, mortgageSummary } from '@/features/mortgage/service';

function Slider({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="mb-5">
      <div className="flex justify-between font-medium">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="font-display font-semibold text-terra-deep">{display}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => { onChange(Number(e.target.value)); }} className="mt-1.5 h-11 w-full accent-terra" />
    </div>
  );
}

/** เครื่องคำนวณค่าผ่อน — ใช้สูตรเดียวกับฝั่ง server (features/mortgage/service) */
export function MortgageCalculator({ initialPrice = 790_000_000 }: { initialPrice?: number }) {
  const [price, setPrice] = useState(initialPrice);
  const [downPct, setDownPct] = useState<number>(DEFAULT_TERMS.downPct);
  const [years, setYears] = useState<number>(DEFAULT_TERMS.years);
  const [ratePct, setRatePct] = useState<number>(DEFAULT_TERMS.ratePct);
  const s = mortgageSummary({ price, downPct, years, ratePct });
  const principalShare = Math.round((s.loan / (s.loan + s.totalInterest)) * 100);

  return (
    <div className="grid overflow-hidden rounded-[32px] bg-cream lg:grid-cols-[1.1fr_1fr]">
      <div className="p-6 sm:p-10">
        <h2 className="font-display text-[28px] font-medium sm:text-[32px]">ผ่อนเดือนละเท่าไหร่?</h2>
        <p className="mt-1.5 mb-6 text-muted">ลองปรับตัวเลขเพื่อดูภาระผ่อนต่อเดือนโดยประมาณ</p>
        <Slider label="ราคาบ้าน" value={price / 100} display={formatBaht(price)} min={1_000_000} max={20_000_000} step={100_000} onChange={v => { setPrice(v * 100); }} />
        <Slider label="เงินดาวน์" value={downPct} display={`${downPct}% · ${formatBaht(Math.round((price * downPct) / 100))}`} min={0} max={50} step={5} onChange={setDownPct} />
        <Slider label="ระยะเวลากู้" value={years} display={`${years} ปี`} min={5} max={40} step={1} onChange={setYears} />
        <Slider label="อัตราดอกเบี้ยเฉลี่ยต่อปี" value={ratePct} display={`${ratePct.toFixed(2)}%`} min={1} max={8} step={0.05} onChange={setRatePct} />
      </div>
      <div className="flex flex-col gap-4 bg-ink p-6 text-cream sm:p-10" aria-live="polite">
        <div>
          <small className="text-[#c9bbae]">ผ่อนต่อเดือนโดยประมาณ</small>
          <p className="font-display text-5xl font-semibold text-[#ffd9b8]">{formatBaht(s.monthly)}</p>
        </div>
        <div aria-hidden className="flex h-3.5 overflow-hidden rounded-full">
          <span className="bg-[#e8913f]" style={{ flex: principalShare }} />
          <span className="bg-[#6e5a4e]" style={{ flex: 100 - principalShare }} />
        </div>
        <dl className="divide-y divide-cream/10">
          <div className="flex justify-between py-2"><dt>วงเงินกู้</dt><dd className="font-semibold">{formatBaht(s.loan)}</dd></div>
          <div className="flex justify-between py-2"><dt>เงินต้น : ดอกเบี้ย</dt><dd className="font-semibold">{principalShare} : {100 - principalShare}</dd></div>
          <div className="flex justify-between py-2"><dt>ดอกเบี้ยรวมตลอดสัญญา</dt><dd className="font-semibold">{formatBaht(s.totalInterest)}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt>รายได้ที่ควรมี (ผ่อนไม่เกิน 40%)</dt><dd className="font-semibold whitespace-nowrap">{formatBaht(s.suggestedIncome)}/เดือน</dd></div>
        </dl>
        <p className="text-sm text-[#b8a99c]">ตัวเลขนี้เป็นการประมาณการเพื่อวางแผนเท่านั้น ไม่ใช่ข้อเสนอสินเชื่อ อัตราดอกเบี้ยและเงื่อนไขจริงขึ้นกับแต่ละธนาคาร</p>
      </div>
    </div>
  );
}
