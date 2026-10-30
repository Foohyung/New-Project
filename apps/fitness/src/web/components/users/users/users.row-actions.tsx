'use client';

import Link from 'next/link';
import { Eye, Pencil } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { DeleteButton, DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';

const ICON = 'inline-flex size-11 items-center justify-center rounded-xl text-muted';

/** (admin) ปุ่มไอคอนท้ายแถวบัญชี: ดูรายละเอียดเจ้าของ · แก้ไข · ลบ */
export function UserRowActions({ id, name, back, viewHref, deleteAction }: {
  id: string;
  name: string;
  /** หน้าที่อยู่ตอนนี้ — กลับมาหลังแก้ไข/ลบ */
  back: string;
  viewHref?: string;
  /** ไม่ส่ง = ลบไม่ได้ (เช่น บัญชีตัวเอง) */
  deleteAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  return (
    <div className="flex items-center gap-1">
      {viewHref && (
        <Link href={viewHref} aria-label={`ดูสาขาและพนักงานของ ${name}`} title="ดูสาขาและพนักงาน" className={`${ICON} hover:bg-lime/10 hover:text-lime`}>
          <Eye aria-hidden className="size-5" />
        </Link>
      )}
      <Link href={`/users/${encodeURIComponent(id)}/edit?back=${encodeURIComponent(back)}`} aria-label={`แก้ไข ${name}`} title="แก้ไข" className={`${ICON} hover:bg-cyan/10 hover:text-cyan`}>
        <Pencil aria-hidden className="size-5" />
      </Link>
      {deleteAction && <DeleteIconButton label={`ลบ ${name}`} confirm={userDeleteText(name)} confirmLabel="ลบบัญชี" action={deleteAction} />}
    </div>
  );
}

/** ปุ่มลบในหน้าแก้ไขบัญชี */
export function DeleteUserButton({ name, action }: { name: string; action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  return <DeleteButton label="ลบบัญชีนี้" confirm={userDeleteText(name)} confirmLabel="ลบบัญชี" action={action} />;
}

const userDeleteText = (name: string) => `ลบบัญชี ${name} ถาวร? ย้อนกลับไม่ได้ (ประวัติใน audit log ยังอยู่)`;
