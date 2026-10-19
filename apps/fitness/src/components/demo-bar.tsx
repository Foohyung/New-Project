'use client';

import { FlaskConical, LogOut, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { ROLE_LABEL } from '@/features/auth/roles';
import type { ShellUser } from './nav';

/** แถบด้านบน: ธีม · ผู้ใช้ที่เข้าสู่ระบบ (บทบาทมาจากบัญชี เปลี่ยนเองไม่ได้) · ออกจากระบบ · รีเซ็ตข้อมูลตัวอย่าง */
export function DemoBar({ user, canReset, resetAction, logoutAction, children }: { user: ShellUser; canReset: boolean; resetAction: () => Promise<void>; logoutAction: () => Promise<void>; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-dashed border-warn/40 bg-warn/5 px-3 py-2 text-sm print:hidden">
      <span className="inline-flex items-center gap-1.5 font-semibold text-warn">
        <FlaskConical aria-hidden className="size-4" />
        โหมดทดลอง
      </span>
      <span className="hidden text-muted xl:inline">ข้อมูลตัวอย่าง · ไม่ได้บันทึกถาวร</span>
      <div className="ml-auto">{children}</div>
      <span className="hidden items-center gap-2 text-muted sm:inline-flex">
        <b className="font-semibold text-ink">{user.name}</b>· {ROLE_LABEL[user.role]}
      </span>
      {canReset && (
        <form action={resetAction} onSubmit={e => { if (!window.confirm('คืนข้อมูลตัวอย่างทั้งหมดเป็นค่าเริ่มต้น?')) e.preventDefault(); }}>
          <button type="submit" title="รีเซ็ตข้อมูลตัวอย่าง" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
            <RotateCcw aria-hidden className="size-4" />
            <span className="sr-only 2xl:not-sr-only">รีเซ็ตข้อมูล</span>
          </button>
        </form>
      )}
      <form action={logoutAction}>
        <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-line px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
          <LogOut aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">ออกจากระบบ</span>
        </button>
      </form>
    </div>
  );
}
