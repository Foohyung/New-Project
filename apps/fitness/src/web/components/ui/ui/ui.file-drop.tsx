'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ImageUp, X } from 'lucide-react';

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** ช่องแนบรูปแบบลากวาง/กดเลือก พร้อมพรีวิว · ใช้ input file จริง (ส่งไปกับฟอร์มได้ตามปกติ) */
export function FileDrop({ id, name, label, hint, accept, maxBytes, error }: { id: string; name: string; label: string; hint?: string; accept: string; maxBytes?: number; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      setFile(null);
      setPreview(null);
      setLocalError(null);
    };
    form.addEventListener('reset', onReset);
    return () => {
      form.removeEventListener('reset', onReset);
    };
  }, []);

  function pick(files: FileList | null) {
    const input = inputRef.current;
    const next = files?.[0] ?? null;
    if (!input) return;
    if (next && maxBytes && next.size > maxBytes) {
      input.value = '';
      setFile(null);
      setPreview(null);
      setLocalError(`ไฟล์ใหญ่เกิน ${formatSize(maxBytes)} (ไฟล์นี้ ${formatSize(next.size)})`);
      return;
    }
    if (files && input.files !== files) input.files = files;
    setLocalError(null);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
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
        className="peer sr-only"
        aria-invalid={shownError ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={event => {
          pick(event.currentTarget.files);
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-lime/60 bg-lime/5 p-3">
          {preview && <Image src={preview} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-lg border border-line bg-bg object-contain" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted">{formatSize(file.size)} · จะอัปโหลดเมื่อกดบันทึก</p>
          </div>
          <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-line px-3 text-sm font-medium text-muted hover:text-text">เปลี่ยน</label>
          <button type="button" onClick={clear} aria-label="เอาไฟล์ออก" className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
            <X aria-hidden className="size-5" />
          </button>
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
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {shownError && <p className="text-sm text-danger">{shownError}</p>}
    </div>
  );
}
