'use client';

import { FlaskConical, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { ROLE_LABEL, ROLES, type Role } from '@/features/auth/roles';

/** แถบโหมดทดลอง: สลับบทบาทเพื่อดูสิทธิ์แต่ละตำแหน่ง (ระยะที่ 2 แทนด้วยการ login จริง) */
export function DemoBar({ role, canReset, switchAction, resetAction }: { role: Role; canReset: boolean; switchAction: (formData: FormData) => Promise<void>; resetAction: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-dashed border-warn/40 bg-warn/5 px-3 py-2 text-sm print:hidden">
      <span className="inline-flex items-center gap-1.5 font-semibold text-warn">
        <FlaskConical aria-hidden className="size-4" />
        โหมดทดลอง
      </span>
      <span className="hidden text-muted sm:inline">ข้อมูลตัวอย่าง · ไม่ได้บันทึกถาวร</span>
      <form ref={formRef} action={switchAction} className="ml-auto flex items-center gap-2" aria-label="สลับบทบาท">
        <label htmlFor="demo-role" className="sr-only text-muted sm:not-sr-only">ดูในฐานะ</label>
        <select
          id="demo-role"
          name="role"
          defaultValue={role}
          onChange={() => formRef.current?.requestSubmit()}
          className="min-h-11 rounded-xl border border-line bg-surface px-3 text-ink"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="min-h-11 rounded-xl border border-line px-3">เปลี่ยน</button>
        </noscript>
      </form>
      {canReset && (
        <form action={resetAction} onSubmit={e => { if (!window.confirm('คืนข้อมูลตัวอย่างทั้งหมดเป็นค่าเริ่มต้น?')) e.preventDefault(); }}>
          <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
            <RotateCcw aria-hidden className="size-4" />
            <span className="sr-only sm:not-sr-only">รีเซ็ตข้อมูล</span>
          </button>
        </form>
      )}
    </div>
  );
}
