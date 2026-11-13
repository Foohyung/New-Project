'use client';

import { useState } from 'react';
import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';
import type { PaymentSetup } from '@/api/types/payments/payments/payments.types';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { FileDrop } from '@/web/components/ui/ui/ui.file-drop';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { btn } from '@/web/components/ui/ui/ui';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'เงินสด' },
  { value: 'card', label: 'บัตรเครดิต/เดบิต' },
  { value: 'promptpay', label: 'PromptPay' },
  { value: 'transfer', label: 'โอนผ่านธนาคาร' },
];

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function PaymentSettingsForm({ setup, hasPromptPayQr, branch, action }: { setup: PaymentSetup; hasPromptPayQr: boolean; branch: string; action: Action }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [methods, setMethods] = useState<PaymentMethod[]>(setup.methods);
  const [promptPayMode, setPromptPayMode] = useState<'id' | 'qr'>(hasPromptPayQr ? 'qr' : 'id');
  const promptPayEnabled = methods.includes('promptpay');

  function toggleMethod(method: PaymentMethod, checked: boolean) {
    setMethods(current => checked ? [...new Set([...current, method])] : current.filter(value => value !== method));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <input type="hidden" name="branch" value={branch} />
      {!promptPayEnabled && (
        <>
          <input type="hidden" name="promptPayMode" value={promptPayMode} />
          <input type="hidden" name="promptPayId" value={setup.promptPayId ?? ''} />
        </>
      )}
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">วิธีชำระที่ต้องการเปิดใช้</legend>
        <p className="mb-2 text-sm text-muted sm:col-span-2">ตัวเลือกที่ปิดจะไม่แสดงในหน้ารับเงินของสาขานี้</p>
        {METHODS.map(method => (
          <label key={method.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg px-4 has-[:checked]:border-lime has-[:checked]:bg-lime/10">
            <input
              type="checkbox"
              name="paymentMethods"
              value={method.value}
              checked={methods.includes(method.value)}
              onChange={event => {
                toggleMethod(method.value, event.currentTarget.checked);
              }}
              className="size-4 accent-lime"
            />
            <span className="text-sm font-medium">{method.label}</span>
          </label>
        ))}
      </fieldset>

      {promptPayEnabled && (
        <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold">รายละเอียด PromptPay</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-lime has-[:checked]:bg-lime/10">
              <input type="radio" name="promptPayMode" value="id" checked={promptPayMode === 'id'} onChange={() => { setPromptPayMode('id'); }} className="mt-1 accent-lime" />
              <span className="text-sm"><b className="block">ใช้เลข PromptPay</b><span className="text-muted">สร้าง QR ตามยอดที่ต้องชำระ</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-lime has-[:checked]:bg-lime/10">
              <input type="radio" name="promptPayMode" value="qr" checked={promptPayMode === 'qr'} onChange={() => { setPromptPayMode('qr'); }} className="mt-1 accent-lime" />
              <span className="text-sm"><b className="block">แนบรูป QR Code</b><span className="text-muted">ใช้รูป QR ที่เตรียมไว้</span></span>
            </label>
          </div>
          {promptPayMode === 'id' ? (
            <label className="grid gap-1 text-sm font-medium">
              เลข PromptPay
              <input
                name="promptPayId"
                defaultValue={setup.promptPayId ?? ''}
                inputMode="numeric"
                autoComplete="off"
                placeholder="เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก"
                className="min-h-12 rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-lime focus:ring-2 focus:ring-lime/20"
              />
              <span className="text-xs font-normal text-muted">ยอมรับเบอร์มือถือ หรือเลขบัตรประชาชน/เลขผู้เสียภาษี 13 หลัก</span>
            </label>
          ) : (
            <div className="grid gap-3">
              <FileDrop
                id="promptPayQrFile"
                name="promptPayQrFile"
                removeName="promptPayQrRemove"
                current={hasPromptPayQr && setup.promptPayQrUrl ? { src: setup.promptPayQrUrl, alt: 'QR PromptPay ปัจจุบัน' } : null}
                hint="PNG, JPEG หรือ WebP ขนาดไม่เกิน 10 MB"
                label="รูป QR PromptPay"
                accept="image/png,image/jpeg,image/webp"
                maxBytes={10 * 1024 * 1024}
              />
              <p className="text-xs text-muted">รูป QR อาจไม่ได้ระบุยอดเงิน กรุณาตรวจยอดที่โอนทุกครั้ง</p>
            </div>
          )}
        </fieldset>
      )}

      {state && <ResultMessage state={state} />}
      <button type="submit" disabled={pending || methods.length === 0} className={`${btn.primary} min-h-12`}>
        {pending ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
      </button>
    </form>
  );
}
