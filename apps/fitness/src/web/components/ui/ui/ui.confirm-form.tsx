'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { btn } from '@/web/components/ui/ui/ui';

export function ConfirmForm({ action, onSubmitData, confirm, confirmTitle = 'ยืนยันการทำรายการ', confirmLabel = 'ยืนยัน', confirmTone = 'primary', className = '', autoComplete, noValidate, encType, children }: {
  action?: (formData: FormData) => void | Promise<void>;
  /** แทน action: ส่ง FormData เองหลังยืนยัน — ฟอร์มไม่ถูกล้างค่า (คู่กับ useFormAction().submit) */
  onSubmitData?: (formData: FormData) => void;
  confirm?: string;
  confirmTitle?: string;
  confirmLabel?: string;
  /** danger = ปุ่มยืนยันสีแดง (ลบ/ย้อนกลับไม่ได้) */
  confirmTone?: 'primary' | 'danger';
  autoComplete?: string;
  noValidate?: boolean;
  encType?: string;
  className?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const allowSubmit = useRef(false);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    if (!confirm || allowSubmit.current) {
      allowSubmit.current = false;
      if (onSubmitData) {
        event.preventDefault();
        onSubmitData(new FormData(event.currentTarget));
      }
      return;
    }
    event.preventDefault();
    setOpen(true);
  }

  function confirmSubmit() {
    setOpen(false);
    dialogRef.current?.close();
    const form = formRef.current;
    if (!form) return;
    allowSubmit.current = true;
    form.requestSubmit();
    allowSubmit.current = false;
  }

  return (
    <>
      <form ref={formRef} action={action} className={className} autoComplete={autoComplete} noValidate={noValidate} encType={encType} onSubmit={handleSubmit}>
        {children}
      </form>
      {confirm && (
        <dialog
          ref={dialogRef}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onCancel={event => { event.preventDefault(); setOpen(false); }}
          onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-left font-normal break-words whitespace-normal text-ink shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${confirmTone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'}`}>
                <TriangleAlert aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 id={titleId} className="font-display text-lg font-semibold">{confirmTitle}</h2>
                <p id={descriptionId} className="mt-1 text-sm text-muted">{confirm}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => { setOpen(false); }} className={btn.secondary}>ยกเลิก</button>
              <button type="button" onClick={confirmSubmit} className={btn[confirmTone]}>{confirmLabel}</button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}