'use client';

import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { btn } from '@/web/components/ui/ui/ui';

export function ChangePasswordForm({ action, minLength }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>; minLength: number }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField name="newPassword" label="รหัสผ่านใหม่" type="password" autoComplete="new-password" minLength={minLength} maxLength={200} hint={`อย่างน้อย ${String(minLength)} ตัว และไม่ซ้ำรหัสเดิม`} error={errors.newPassword} required />
      <TextField name="confirmPassword" label="ยืนยันรหัสผ่านใหม่" type="password" autoComplete="new-password" maxLength={200} error={errors.confirmPassword} required />
      <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>{pending ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
      <ResultMessage state={state && !state.ok ? state : null} />
    </form>
  );
}

/** ฟอร์มลืมรหัสผ่าน — ส่งแล้วแสดงขั้นตอนถัดไปแทนฟอร์ม */
export function ForgotPasswordForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) {
    return <p role="status" className="rounded-xl border border-lime/40 bg-lime/10 p-4 text-sm text-lime">{state.message}</p>;
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField name="identifier" label="อีเมลหรือเบอร์โทร" autoComplete="username" error={errors.identifier} required />
      <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>{pending ? 'กำลังส่ง…' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}</button>
      <ResultMessage state={state} />
    </form>
  );
}
