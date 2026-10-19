'use client';

import { BriefcaseBusiness, ConciergeBell, Crown, Dumbbell, FlaskConical, IdCard, RotateCcw } from 'lucide-react';
import { useOptimistic, useTransition, type ReactNode } from 'react';
import { ROLE_LABEL, ROLES, type Role } from '@/features/auth/roles';
import { Dropdown } from './dropdown';

const ROLE_INFO: Record<Role, { icon: ReactNode; description: string }> = {
  owner: { icon: <Crown className="size-4" />, description: 'เห็นทุกอย่าง รวมถึงแก้ราคาแพ็กเกจ' },
  manager: { icon: <BriefcaseBusiness className="size-4" />, description: 'รายได้ ยืนยันสลิป รายงาน' },
  'front-desk': { icon: <ConciergeBell className="size-4" />, description: 'เช็กอิน สมัคร รับชำระ (ไม่เห็นรายได้)' },
  trainer: { icon: <Dumbbell className="size-4" />, description: 'ตารางคลาสและคิว PT ของตัวเอง' },
  member: { icon: <IdCard className="size-4" />, description: 'บัตร QR จองคลาส ชำระเงินของตัวเอง' },
};

/** แถบโหมดทดลอง: สลับบทบาทเพื่อดูสิทธิ์แต่ละตำแหน่ง (ระยะที่ 2 แทนด้วยการ login จริง) */
export function DemoBar({ role, canReset, switchAction, resetAction }: { role: Role; canReset: boolean; switchAction: (formData: FormData) => Promise<void>; resetAction: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [shownRole, setShownRole] = useOptimistic(role);
  const switchTo = (next: string) => {
    const formData = new FormData();
    formData.set('role', next);
    startTransition(async () => {
      setShownRole(next as Role);
      await switchAction(formData);
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-dashed border-warn/40 bg-warn/5 px-3 py-2 text-sm print:hidden">
      <span className="inline-flex items-center gap-1.5 font-semibold text-warn">
        <FlaskConical aria-hidden className="size-4" />
        โหมดทดลอง
      </span>
      <span className="hidden text-muted sm:inline">ข้อมูลตัวอย่าง · ไม่ได้บันทึกถาวร</span>
      <div className={`ml-auto ${pending ? 'opacity-60' : ''}`} aria-busy={pending}>
        <Dropdown
          label="ดูในฐานะ"
          inline
          variant="toolbar"
          align="end"
          value={shownRole}
          onChange={switchTo}
          options={ROLES.map(r => ({ value: r, label: ROLE_LABEL[r], ...ROLE_INFO[r] }))}
        />
      </div>
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
