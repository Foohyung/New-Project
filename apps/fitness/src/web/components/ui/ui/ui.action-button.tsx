'use client';

import Link from 'next/link';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { btn } from '@/web/components/ui/ui/ui';
import { useNotifyingAction, useToastOnSuccess } from '@/web/components/ui/ui/ui.toast';

/**
 * ปุ่มที่เรียก Server Action หนึ่งครั้ง และแสดงผลลัพธ์ใต้ปุ่ม
 * `confirm` = ข้อความยืนยันก่อนทำรายการที่ย้อนกลับไม่ได้ (§15.1)
 */
export function ActionButton({
  action,
  label,
  pendingLabel = 'กำลังบันทึก…',
  variant = 'secondary',
  confirm,
  successTitle,
  className = '',
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  variant?: keyof typeof btn;
  confirm?: string;
  /** สำเร็จแล้วแสดง popup กลางจอหัวข้อนี้ (แทน toast มุมจอ) */
  successTitle?: string;
  className?: string;
}) {
  // ทุกรายการที่ต้องยืนยัน (แก้ไข/ลบ/ยกเลิก) แจ้งผลด้วย popup กลางจอ
  const { state, run, pending } = useNotifyingAction(action, { successTitle: successTitle ?? (confirm ? 'ทำรายการสำเร็จ' : undefined) });
  return (
    <ConfirmForm
      onSubmitData={run}
      confirm={confirm}
      confirmTone={variant === 'danger' ? 'danger' : 'primary'}
      className={`flex flex-col gap-1.5 ${className}`}
    >
      <button type="submit" disabled={pending} className={btn[variant]}>
        {pending ? pendingLabel : label}
      </button>
      {/* แจ้ง popup ไปแล้วใน useNotifyingAction — ตรงนี้แสดงข้อความอย่างเดียว */}
      <ResultText state={state} />
    </ConfirmForm>
  );
}

/** ข้อความผลลัพธ์ใต้ฟอร์ม + popup แจ้งเตือนมุมจอเมื่อสำเร็จ (ใช้ทุกฟอร์มในระบบ) · successTitle = popup กลางจอแทน */
export function ResultMessage({ state, successTitle }: { state: ActionResult; successTitle?: string }) {
  useToastOnSuccess(state, successTitle);
  return <ResultText state={state} />;
}

/** ข้อความผลลัพธ์อย่างเดียว ไม่แจ้ง popup (ใช้คู่กับ useNotifyingAction) */
export function ResultText({ state }: { state: ActionResult }) {
  if (!state) return <span aria-live="polite" className="sr-only" />;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={`text-sm ${state.ok ? 'ff-pop-in text-lime' : 'ff-shake text-danger'}`}>
      {state.message}
      {state.ok && state.href && (
        <>
          {' '}
          <Link href={state.href} className="tap inline-block font-semibold underline underline-offset-2">ดูรายการชำระ</Link>
        </>
      )}
    </p>
  );
}
