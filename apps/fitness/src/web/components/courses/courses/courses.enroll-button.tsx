'use client';

import { useState } from 'react';
import { enrollSelfAction } from '@/api/actions/courses/courses/courses.actions';
import { formatBaht } from '@/api/lib/utils/utils/utils';
import { PurchaseCouponField, type AppliedCoupon } from '@/web/components/coupons/coupons/coupons.field';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { btn } from '@/web/components/ui/ui/ui';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';

export function CourseEnrollButton({ courseId, title, priceSatang }: { courseId: string; title: string; priceSatang: number }) {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const { state, submit, pending } = useFormAction(enrollSelfAction.bind(null, courseId));
  const total = priceSatang - (coupon?.discountSatang ?? 0);

  return (
    <ConfirmForm
      onSubmitData={submit}
      confirm={`สมัคร ${title} ราคา ${formatBaht(total)}? ระบบจะพาไปหน้าชำระเงิน`}
      confirmTitle="ยืนยันสมัครคอร์ส"
      confirmLabel="สมัคร"
      className="mt-2 flex flex-col gap-3"
    >
      <PurchaseCouponField purchase={{ target: 'course', courseId }} applied={coupon} onApplied={setCoupon} />
      {coupon && coupon.discountSatang > 0 && (
        <div className="flex justify-between text-sm text-lime">
          <span>ส่วนลด ({coupon.code})</span><b>−{formatBaht(coupon.discountSatang)}</b>
        </div>
      )}
      <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังสมัคร…' : `สมัคร · ${formatBaht(total)}`}</button>
      <ResultMessage state={state} />
    </ConfirmForm>
  );
}
