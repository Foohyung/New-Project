'use client';

import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { roleLabel } from '@/api/services/auth/auth/auth.roles';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import type { ShellUser } from '@/web/components/layout/layout/layout.nav';

/** แถบด้านบน: ธีม · ผู้ใช้ที่เข้าสู่ระบบ (บทบาทมาจากบัญชี เปลี่ยนเองไม่ได้) · ออกจากระบบ */
export function DemoBar({ user, logoutAction, children }: { user: ShellUser; logoutAction: () => Promise<void>; children?: ReactNode }) {
  return (
    <div className="ff-static flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface px-3 py-2 text-sm print:hidden">
      <div className="ml-auto">{children}</div>
      <span className="hidden items-center gap-2 text-muted sm:inline-flex">
        <b className="font-semibold text-ink">{user.name}</b>· {roleLabel(user.role, user.roleName)}
      </span>
      <ConfirmForm action={logoutAction} confirm="ต้องการออกจากระบบหรือไม่?" confirmTitle="ยืนยันออกจากระบบ" confirmLabel="ออกจากระบบ" className="md:hidden">
        <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-line px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
          <LogOut aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">ออกจากระบบ</span>
        </button>
      </ConfirmForm>
    </div>
  );
}
