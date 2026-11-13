'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ImageUp, Trash2, X } from 'lucide-react';

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * ช่องแนบรูปแบบลากวาง/กดเลือก พร้อมพรีวิว · ใช้ input file จริง (ส่งไปกับฟอร์มได้ตามปกติ)
 * `current` = รูปที่บันทึกไว้แล้ว: เลือกรูปใหม่ = แทนที่ · กด "ลบรูป" = ส่ง `removeName=1` ไปกับฟอร์ม (ลบจริงเมื่อกดบันทึก)
 */
export function FileDrop({ id, name, label, hint, accept, maxBytes, error, required, onFileChange, current, removeName }: { id: string; name: string; label: string; hint?: string; accept: string; maxBytes?: number; error?: string; required?: boolean; onFileChange?: (file: File | null) => void; current?: { src: string; alt: string } | null; removeName?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removed, setRemoved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;

  // คืนหน่วยความจำของ object URL เมื่อเปลี่ยนรูปหรือเลิกแสดง
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // ฟอร์มถูก reset หลังส่งสำเร็จ (React 19) → ล้างพรีวิวตาม
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setRemoved(false);
      setFile(null);
      setPreview(null);
      setLocalError(null);
      onFileChange?.(null);
    };
    form.addEventListener('reset', onReset);
    return () => {
      form.removeEventListener('reset', onReset);
    };
  }, [onFileChange]);

  function pick(files: FileList | null) {
    const input = inputRef.current;
    const next = files?.[0] ?? null;
    if (!input) return;
    if (next && maxBytes && next.size > maxBytes) {
      input.value = '';
      setFile(null);
      setPreview(null);
      setLocalError(`ไฟล์ใหญ่เกิน ${formatSize(maxBytes)} (ไฟล์นี้ ${formatSize(next.size)})`);
      onFileChange?.(null);
      return;
    }
    if (files && input.files !== files) input.files = files;
    setLocalError(null);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    onFileChange?.(next);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = '';
    pick(null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="peer sr-only"
        aria-invalid={shownError ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={event => {
          pick(event.currentTarget.files);
        }}
      />
      {removeName && removed && !file && <input type="hidden" name={removeName} value="1" />}
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-lime/60 bg-lime/5 p-3">
          {preview && <Image src={preview} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-lg border border-line bg-bg object-contain" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted">{formatSize(file.size)} · {current && !removed ? 'จะแทนที่รูปเดิมเมื่อกดบันทึก' : 'จะอัปโหลดเมื่อกดบันทึก'}</p>
          </div>
          <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-line px-3 text-sm font-medium text-muted hover:text-text">เปลี่ยน</label>
          <button type="button" onClick={clear} aria-label="เอาไฟล์ออก" className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      ) : current && !removed ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
          <Image src={current.src} alt={current.alt} width={80} height={80} unoptimized className="size-20 shrink-0 rounded-lg border border-line bg-white object-contain p-1" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">รูปปัจจุบัน</p>
            <p className="text-xs text-muted">เลือกรูปใหม่เพื่อแทนที่ หรือลบรูปนี้</p>
          </div>
          <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-line px-3 text-sm font-medium text-muted hover:text-text">เปลี่ยนรูป</label>
          {removeName && (
            <button type="button" onClick={() => { setRemoved(true); }} aria-label="ลบรูปปัจจุบัน" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger/10">
              <Trash2 aria-hidden className="size-4" />ลบรูป
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={event => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={onDrop}
          data-dragging={dragging || undefined}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-bg px-4 py-6 text-center transition-colors hover:border-lime/60 hover:bg-lime/5 peer-focus-visible:outline-2 peer-focus-visible:outline-lime data-[dragging]:border-lime data-[dragging]:bg-lime/10"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-lime/15 text-lime">
            <ImageUp aria-hidden className="size-5" />
          </span>
          <span className="text-sm">
            <span className="font-semibold text-lime">คลิกเพื่อเลือกไฟล์</span> หรือลากรูปมาวางที่นี่
          </span>
        </label>
      )}
      {removed && !file && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-danger">
          รูปเดิมจะถูกลบเมื่อกดบันทึก
          <button type="button" onClick={() => { setRemoved(false); }} className="font-semibold text-lime underline-offset-2 hover:underline">ยกเลิกการลบ</button>
        </p>
      )}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {shownError && <p className="text-sm text-danger">{shownError}</p>}
    </div>
  );
}
