'use client';

import { Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '@/web/hooks/ui/ui/ui.use-body-scroll-lock';

/**
 * popup ใส่ฟอร์ม (เพิ่ม/แก้ไข) กลางจอ — เนื้อหา mount ใหม่ทุกครั้งที่เปิด ฟอร์มจึงเริ่มจากค่าตั้งต้นเสมอ
 * ปิดได้ด้วย Esc, ปุ่ม ✕ หรือคลิกนอกกล่อง · ConfirmForm ข้างในเปิด popup ยืนยันซ้อนได้
 */
export function FormDialog({ open, onClose, title, subtitle, size = 'default', children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; size?: 'default' | 'wide' | 'wider' | 'extra-wide'; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${size === 'extra-wide' ? 'max-w-7xl' : size === 'wider' ? 'max-w-6xl' : size === 'wide' ? 'max-w-4xl' : 'max-w-xl'} overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-left font-normal break-words whitespace-normal text-ink shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className={size === 'extra-wide' ? 'p-5 sm:p-8' : 'p-5 sm:p-6'}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className={`font-display font-semibold ${size === 'extra-wide' ? 'text-2xl' : 'text-lg'}`}>{title}</h2>
              {subtitle && <p className={`mt-1 text-muted ${size === 'extra-wide' ? 'text-base' : 'text-sm'}`}>{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="ปิด" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * ปุ่ม + กลม มุมขวาล่างของกล่องรายการ — กดแล้วเปิด popup เพิ่มรายการ (วางเป็นลูกตัวสุดท้ายของ <Card>)
 * label = ข้อความที่อ่านออกเสียง/ขึ้นเมื่อชี้ เช่น "เพิ่มสินค้า"
 */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-4 flex justify-end">
      <button type="button" onClick={onClick} aria-label={label} title={label} className="ff-press inline-flex size-14 items-center justify-center rounded-full bg-lime text-bg shadow-lg shadow-lime/20 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">
        <Plus aria-hidden className="size-7" />
      </button>
    </div>
  );
}
