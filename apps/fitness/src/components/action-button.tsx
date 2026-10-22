'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ActionResult } from '@/features/shared/action-result';
import { ConfirmForm } from './confirm-form';
import { btn } from './ui';

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
  className = '',
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  variant?: keyof typeof btn;
  confirm?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  return (
    <ConfirmForm
      action={formAction}
      confirm={confirm}
      className={`flex flex-col gap-1.5 ${className}`}
    >
      <button type="submit" disabled={pending} className={btn[variant]}>
        {pending ? pendingLabel : label}
      </button>
      <ResultMessage state={state} />
    </ConfirmForm>
  );
}

export function ResultMessage({ state }: { state: ActionResult }) {
  if (!state) return <span aria-live="polite" className="sr-only" />;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={`text-sm ${state.ok ? 'text-lime' : 'text-danger'}`}>
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
