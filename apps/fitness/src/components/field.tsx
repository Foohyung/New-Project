import type { InputHTMLAttributes, ReactNode } from 'react';
import { inputClass } from './ui';

/** ช่องกรอกที่มี label, คำอธิบาย และข้อความ error ผูกกับ aria ครบ (§15.1) */
export function TextField({ name, id, label, error, hint, optional, ...props }: { name: string; label: string; error?: string; hint?: ReactNode; optional?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? name;
  const describedBy = [hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label} {optional && <span className="font-normal text-faint">(ไม่บังคับ)</span>}
      </label>
      <input id={inputId} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={inputClass} {...props} />
      {hint && <p id={`${inputId}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <p id={id} className="text-sm text-danger">{error}</p> : null;
}

/** การ์ดตัวเลือกแบบ radio (เป้าหมายแตะใหญ่ ใช้ง่ายบนแท็บเล็ตเคาน์เตอร์) */
export function ChoiceCard({ name, value, checked, onChange, title, detail, aside }: { name: string; value: string; checked: boolean; onChange: (value: string) => void; title: string; detail?: string; aside?: ReactNode }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3 has-[:checked]:border-lime has-[:checked]:bg-lime/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => {
          onChange(value);
        }} className="size-5 shrink-0 accent-lime" />
      <span className="min-w-0 flex-1">
        <b className="block font-semibold">{title}</b>
        {detail && <small className="block text-xs text-muted">{detail}</small>}
      </span>
      {aside}
    </label>
  );
}
