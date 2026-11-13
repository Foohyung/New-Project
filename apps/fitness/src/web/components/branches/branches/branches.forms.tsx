'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { BranchDto } from '@/api/types/branches/branches/branches.types';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { DeleteButton, DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { AddButton, FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn, inputClass } from '@/web/components/ui/ui/ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function BranchFields({ branch, errors }: { branch?: BranchDto; errors: Record<string, string> }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="name" label="ชื่อสาขา" placeholder="เช่น สาขาบางนา" defaultValue={branch?.name} autoComplete="off" error={errors.name} required />
        <TextField name="phone" label="เบอร์โทรสาขา" inputMode="tel" placeholder="เช่น 021234567" defaultValue={branch?.phone ?? ''} autoComplete="off" error={errors.phone} optional />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-semibold">ที่อยู่ <span className="font-normal text-faint">(ไม่บังคับ)</span></label>
        <textarea id="address" name="address" rows={2} defaultValue={branch?.address ?? ''} aria-invalid={errors.address ? true : undefined} className={`${inputClass} py-3 leading-relaxed`} />
        {errors.address && <p className="text-sm text-danger">{errors.address}</p>}
      </div>
    </>
  );
}

/** ฟอร์มเพิ่มสาขา (ใน popup) — สำเร็จแล้วปิด popup + toast · error คงค่าที่กรอกไว้ */
function BranchCreateForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <BranchFields errors={errors} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มสาขา'}</button>
      </div>
    </form>
  );
}

/** ปุ่ม + มุมขวาล่างของกล่องสาขา → popup เพิ่มสาขา */
export function AddBranchButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <AddButton label="เพิ่มสาขา" onClick={() => { setOpen(true); }} />
      <FormDialog open={open} onClose={close} title="เพิ่มสาขา" subtitle="สาขาใหม่จะให้เลือกได้ทันทีตอนเพิ่มบัญชีผู้ใช้">
        <BranchCreateForm action={action} onDone={close} />
      </FormDialog>
    </>
  );
}

/** แก้ไขสาขา — ยืนยันก่อนบันทึก · เปลี่ยนชื่อแล้วบัญชีผู้ใช้ สาขาของเจ้าของ และแบรนด์ของสาขานี้ย้ายตามชื่อใหม่ */
export function BranchEditForm({ branch, action }: { branch: BranchDto; action: Action }) {
  const { state, submit, pending } = useFormAction(action);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ConfirmForm
      onSubmitData={submit}
      confirm={`บันทึกการแก้ไขสาขา "${branch.name}"?${branch.userCount > 0 ? ` ถ้าเปลี่ยนชื่อ บัญชีผู้ใช้ ${String(branch.userCount)} บัญชีในสาขานี้จะย้ายไปใช้ชื่อใหม่ด้วย` : ''}`}
      confirmTitle="ยืนยันการแก้ไข"
      confirmLabel="บันทึก"
      noValidate
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" value={branch.id} />
      <BranchFields branch={branch} errors={errors} />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={branch.active} className="size-5 accent-lime" />
        เปิดใช้งานสาขา <span className="text-muted">(ไม่ติ๊ก = ไม่แสดงให้เลือกตอนเพิ่มบัญชีใหม่ บัญชีเดิมในสาขายังใช้งานได้)</span>
      </label>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
      </div>
    </ConfirmForm>
  );
}

const branchDeleteText = (name: string) => `ลบสาขา ${name} ถาวร? สาขาเพิ่มเติมของเจ้าของและแบรนด์ของสาขานี้จะถูกลบด้วย (ประวัติใน audit log ยังอยู่)`;

/** ปุ่มลบในหน้าแก้ไขสาขา */
export function DeleteBranchButton({ name, action }: { name: string; action: Action }) {
  return <DeleteButton label="ลบสาขานี้" confirm={branchDeleteText(name)} confirmLabel="ลบสาขา" action={action} />;
}

/** ปุ่ม ✏️ 🗑 ท้ายแถว · สาขาที่มีบัญชีผู้ใช้อยู่ไม่มีปุ่มลบ (ลบไม่ได้จนกว่าจะย้ายบัญชีออก) */
export function BranchRowActions({ id, name, deleteAction }: { id: string; name: string; deleteAction?: Action }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/branches/${encodeURIComponent(id)}/edit`} aria-label={`แก้ไข ${name}`} title="แก้ไข" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-cyan/10 hover:text-cyan">
        <Pencil aria-hidden className="size-5" />
      </Link>
      {deleteAction && <DeleteIconButton label={`ลบ ${name}`} confirm={branchDeleteText(name)} confirmLabel="ลบสาขา" action={deleteAction} />}
    </div>
  );
}
