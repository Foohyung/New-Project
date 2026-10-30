'use client';

import { CircleCheck, TicketPercent, X } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';
import { previewCouponAction } from '@/api/actions/coupons/coupons/coupons.actions';
import { inputClass } from '@/web/components/ui/ui/ui';

export interface AppliedCoupon {
  code: string;
  discountSatang: number;
  bonusDays: number;
  label: string;
}

/**
 * ช่องใส่คูปอง: กด "ใช้โค้ด" เพื่อดูส่วนลดก่อนชำระ แล้วส่งค่าไปกับฟอร์มผ่าน hidden input
 * ระบบตรวจซ้ำอีกครั้งตอนบันทึกจริง (หน้าเว็บแสดงผลเพื่อ UX เท่านั้น)
 */
export function CouponField({ packageId, memberId, applied, onApplied, error }: { packageId: string; memberId: string | null; applied: AppliedCoupon | null; onApplied: (c: AppliedCoupon | null) => void; error?: string }) {
  const id = useId();
  const [code, setCode] = useState(applied?.code ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (value: string) => {
    startTransition(async () => {
      const r = await previewCouponAction({ code: value, packageId, memberId });
      if (r.ok) {
        onApplied({ code: r.code, discountSatang: r.discountSatang, bonusDays: r.bonusDays, label: r.label });
        setMessage(null);
      } else {
        onApplied(null);
        setMessage(r.message);
      }
    });
  };

  // เปลี่ยนแพ็กเกจแล้วตรวจโค้ดเดิมใหม่ (บางโค้ดใช้ได้เฉพาะบางแพ็กเกจ)
  useEffect(() => {
    if (applied) check(applied.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตรวจใหม่เฉพาะเมื่อแพ็กเกจเปลี่ยน
  }, [packageId]);

  const shown = error ?? message;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">โค้ดส่วนลด <span className="font-normal text-faint">(ไม่บังคับ)</span></label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <TicketPercent aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            id={id}
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              if (applied) onApplied(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                check(code);
              }
            }}
            placeholder="เช่น RENEW10"
            autoComplete="off"
            aria-invalid={shown ? true : undefined}
            aria-describedby={shown ? `${id}-msg` : undefined}
            className={`${inputClass} pl-11 uppercase`}
          />
        </div>
        {applied ? (
          <button type="button" onClick={() => { setCode(''); onApplied(null); }} className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-line px-3 text-muted hover:text-ink" aria-label="ยกเลิกโค้ด">
            <X aria-hidden className="size-5" />
          </button>
        ) : (
          <button type="button" disabled={pending || !code.trim()} onClick={() => { check(code); }} className="inline-flex min-h-12 items-center rounded-xl border border-line bg-surface-2 px-4 font-semibold disabled:opacity-50">
            {pending ? 'กำลังตรวจ…' : 'ใช้โค้ด'}
          </button>
        )}
      </div>
      <input type="hidden" name="couponCode" value={applied?.code ?? ''} />
      {applied && <p role="status" className="flex items-center gap-1.5 text-sm text-lime"><CircleCheck aria-hidden className="size-4" />ใช้โค้ด {applied.code} แล้ว · {applied.label}</p>}
      {shown && !applied && <p id={`${id}-msg`} role="alert" className="text-sm text-danger">{shown}</p>}
    </div>
  );
}
