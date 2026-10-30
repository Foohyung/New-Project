'use client';

import { loginAction } from '@/features/auth/actions';
import { TextField } from './field';
import { btn } from './ui';
import { useFormAction } from './use-form-action';

export function LoginForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <TextField name="email" label="อีเมล" type="email" autoComplete="username" inputMode="email" required error={errors?.email} />
      <TextField name="password" label="รหัสผ่าน" type="password" autoComplete="current-password" required error={errors?.password} />
      {state && !state.ok && !errors && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
    </form>
  );
}
