'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { TextField } from './field';
import { btn } from './ui';

export function PackageForm({ pkg, action }: { pkg: { id: string; priceSatang: number; description: string; active: boolean }; action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <TextField name="price" id={`price-${pkg.id}`} label="ราคา (บาท)" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={pkg.priceSatang / 100} error={errors.price} />
        <TextField name="description" id={`description-${pkg.id}`} label="รายละเอียด" defaultValue={pkg.description} error={errors.description} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={pkg.active} className="size-5 accent-lime" />
        เปิดขาย (แสดงในหน้าสมัครและหน้าสมาชิก)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.secondary}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}
