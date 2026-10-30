'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { btn } from '@/web/components/ui/ui/ui';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';

export function PackageForm({ pkg, action }: { pkg: { id: string; priceSatang: number; description: string; active: boolean }; action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <ConfirmForm action={formAction} confirm="บันทึกการแก้ไขแพ็กเกจนี้? ราคาใหม่ใช้กับการสมัคร/ต่ออายุครั้งถัดไป" confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <TextField name="price" id={`price-${pkg.id}`} label="ราคา (บาท)" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={pkg.priceSatang / 100} error={errors.price} />
        <TextField name="description" id={`description-${pkg.id}`} label="รายละเอียด" defaultValue={pkg.description} error={errors.description} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={pkg.active} className="size-5 accent-lime" />
        เปิดขาย (แสดงในหน้าสมัครและหน้าสมาชิก)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
      </div>
    </ConfirmForm>
  );
}
