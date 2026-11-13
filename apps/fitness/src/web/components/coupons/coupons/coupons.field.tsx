'use client';

import { CircleCheck, ShieldCheck, TicketPercent, X } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';
import { previewCouponAction, previewPurchaseCouponAction } from '@/api/actions/coupons/coupons/coupons.actions';
import { inputClass } from '@/web/components/ui/ui/ui';

export interface AppliedCoupon {
  code: string;
  discountSatang: number;
  bonusDays: number;
  label: string;
  terms?: string | null;
  proofRequired?: string | null;
}

export type PurchaseCouponRequest =
  | { target: 'product'; items: { productId: string; qty: number }[] }
  | { target: 'course'; courseId: string };

function CouponInput({ code, setCode, check, pending, applied, onApplied, message, placeholder }: {
  code: string;
  setCode: (code: string) => void;
  check: (code: string) => void;
  pending: boolean;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
  message: string | null;
  placeholder: string;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">โค้ดส่วนลด <span className="font-normal text-faint">(ไม่บังคับ)</span></label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <TicketPercent aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            id={id}
            value={code}
            onChange={event => {
              setCode(event.target.value.toUpperCase());
              if (applied) onApplied(null);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                check(code);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-msg` : undefined}
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
      {applied?.terms && <p className="rounded-xl border border-line bg-bg px-3 py-2 text-sm whitespace-pre-line text-muted"><b className="text-ink">เงื่อนไข:</b> {applied.terms}</p>}
      {applied?.proofRequired && (
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-warn/50 bg-warn/10 px-3 py-2.5 text-sm">
          <input type="checkbox" name="couponProof" required className="mt-0.5 size-5 shrink-0 accent-lime" />
          <span><b className="flex items-center gap-1.5"><ShieldCheck aria-hidden className="size-4 text-warn" />ตรวจหลักฐานแล้ว</b><span className="text-muted">{applied.proofRequired}</span></span>
        </label>
      )}
      {message && <p id={`${id}-msg`} role="alert" className="text-sm text-danger">{message}</p>}
    </div>
  );
}

export function CouponField({ packageId, memberId, applied, onApplied, error }: {
  packageId: string;
  memberId: string | null;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
  error?: string;
}) {
  const [code, setCode] = useState(applied?.code ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (value: string) => {
    startTransition(async () => {
      const result = await previewCouponAction({ code: value, packageId, memberId });
      if (result.ok) {
        onApplied({ code: result.code, discountSatang: result.discountSatang, bonusDays: result.bonusDays, label: result.label, terms: result.terms, proofRequired: result.proofRequired });
        setMessage(null);
      } else {
        onApplied(null);
        setMessage(result.message);
      }
    });
  };

  useEffect(() => {
    if (applied) check(applied.code);
    // Recheck only when the selected package changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  return <CouponInput code={code} setCode={setCode} check={check} pending={pending} applied={applied} onApplied={onApplied} message={error ?? message} placeholder="เช่น RENEW10" />;
}

export function PurchaseCouponField({ purchase, applied, onApplied }: {
  purchase: PurchaseCouponRequest;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
}) {
  const [code, setCode] = useState(applied?.code ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (value: string) => {
    startTransition(async () => {
      const result = await previewPurchaseCouponAction({ code: value, ...purchase });
      if (result.ok) {
        onApplied({ code: result.code, discountSatang: result.discountSatang, bonusDays: result.bonusDays, label: result.label, terms: result.terms, proofRequired: result.proofRequired });
        setMessage(null);
      } else {
        onApplied(null);
        setMessage(result.message);
      }
    });
  };

  return <CouponInput code={code} setCode={setCode} check={check} pending={pending} applied={applied} onApplied={onApplied} message={message} placeholder="เช่น SAVE10" />;
}
