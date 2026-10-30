'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { btn } from '@/web/components/ui/ui/ui';
import { useNotifyingAction } from '@/web/components/ui/ui/ui.toast';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** ไอคอนถังขยะท้ายแถว — ยืนยันก่อน · สำเร็จ = popup "ลบสำเร็จ" · ไม่สำเร็จ = popup error (ไม่มีที่แสดงใต้ปุ่ม) */
export function DeleteIconButton({ label, confirm, confirmLabel = 'ลบ', action }: { label: string; confirm: string; confirmLabel?: string; action: Action }) {
  // แจ้งผลทันทีที่ server ตอบ — แถวนี้หายไปพร้อมรายการหลังลบ
  const { run, pending } = useNotifyingAction(action, { successTitle: 'ลบสำเร็จ', errorToast: true });
  return (
    <ConfirmForm onSubmitData={run} confirm={confirm} confirmTitle="ยืนยันการลบ" confirmLabel={confirmLabel} confirmTone="danger" className="relative">
      <button type="submit" disabled={pending} aria-label={label} title="ลบ" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-60">
        <Trash2 aria-hidden className="size-5" />
      </button>
    </ConfirmForm>
  );
}

/**
 * ปุ่มลบเต็มขนาด (หน้ารายละเอียด/แก้ไข) — ยืนยันก่อน
 * ลบสำเร็จ server redirect กลับหน้ารายการพร้อม ?deleted= แล้ว <DeletedFlash /> แสดง popup (หน้าเดิมหายไปแล้ว)
 */
export function DeleteButton({ label, confirm, confirmLabel = 'ลบ', action }: { label: string; confirm: string; confirmLabel?: string; action: Action }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  return (
    <ConfirmForm action={formAction} confirm={confirm} confirmTitle="ยืนยันการลบ" confirmLabel={confirmLabel} confirmTone="danger" className="flex flex-col items-start gap-1.5">
      <button type="submit" disabled={pending} className={btn.danger}><Trash2 aria-hidden className="size-5" />{pending ? 'กำลังลบ…' : label}</button>
      <ResultMessage state={state && !state.ok ? state : null} />
    </ConfirmForm>
  );
}
