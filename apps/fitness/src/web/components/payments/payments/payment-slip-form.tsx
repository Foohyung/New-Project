'use client';

import { useState } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { FileDrop } from '@/web/components/ui/ui/ui.file-drop';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { btn } from '@/web/components/ui/ui/ui';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';

type Action = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
const MAX_SLIP_BYTES = 10 * 1024 * 1024;

export function PaymentSlipForm({ action }: { action: Action }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [file, setFile] = useState<File | null>(null);
  const error = state && !state.ok ? state.fieldErrors?.slipFile : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <FileDrop
        id="slipFile"
        name="slipFile"
        label="แนบรูปสลิปโอนเงิน"
        hint="PNG, JPEG หรือ WebP ขนาดไม่เกิน 10 MB"
        accept="image/png,image/jpeg,image/webp"
        maxBytes={MAX_SLIP_BYTES}
        required
        error={error}
        onFileChange={setFile}
      />
      <button type="submit" disabled={pending || !file} className={`${btn.primary} min-h-12`}>
        {pending ? 'กำลังส่งสลิป…' : 'แนบสลิปและแจ้งชำระ'}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}
