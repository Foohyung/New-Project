'use client';

import Link from 'next/link';
import { Eye, Pencil } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { DeleteButton, DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
const ICON = 'inline-flex size-11 items-center justify-center rounded-xl text-muted';

export const memberDeleteText = (name: string) =>
  `ลบสมาชิก ${name} ถาวร? ประวัติเช็กอิน การจอง การชำระเงิน/ใบเสร็จ และบัญชีเข้าสู่ระบบของสมาชิกจะถูกลบด้วย ย้อนกลับไม่ได้`;

/** ปุ่มไอคอนท้ายแถวสมาชิก: ดูโปรไฟล์ · แก้ไข · ลบ (แสดงเฉพาะที่มีสิทธิ์) */
export function MemberRowActions({ id, name, canEdit, deleteAction }: { id: string; name: string; canEdit: boolean; deleteAction?: Action }) {
  const href = `/members/${encodeURIComponent(id)}`;
  return (
    <div className="flex items-center gap-1">
      <Link href={href} aria-label={`ดูโปรไฟล์ ${name}`} title="ดูโปรไฟล์" className={`${ICON} hover:bg-lime/10 hover:text-lime`}>
        <Eye aria-hidden className="size-5" />
      </Link>
      {canEdit && (
        <Link href={`${href}#edit`} aria-label={`แก้ไข ${name}`} title="แก้ไข" className={`${ICON} hover:bg-cyan/10 hover:text-cyan`}>
          <Pencil aria-hidden className="size-5" />
        </Link>
      )}
      {deleteAction && <DeleteIconButton label={`ลบ ${name}`} confirm={memberDeleteText(name)} confirmLabel="ลบสมาชิก" action={deleteAction} />}
    </div>
  );
}

/** ปุ่มลบในหน้าโปรไฟล์ — ลบแล้วกลับไปหน้ารายชื่อสมาชิก */
export function DeleteMemberButton({ name, action }: { name: string; action: Action }) {
  return <DeleteButton label="ลบสมาชิกนี้" confirm={memberDeleteText(name)} confirmLabel="ลบสมาชิก" action={action} />;
}
