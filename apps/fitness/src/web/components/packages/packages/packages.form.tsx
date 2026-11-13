'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { ManagedPackageDto } from '@/api/types/packages/packages/packages.types';
import { DURATION_LIMIT, type PackageKindInput } from '@/api/schemas/packages/packages/packages.schema';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';
import { Dropdown, type DropdownOption } from '@/web/components/ui/ui/ui.dropdown';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { AddButton, FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn } from '@/web/components/ui/ui/ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export const PACKAGE_KIND_LABEL: Record<PackageKindInput, string> = { time: 'สมาชิกรายเดือน', pt: 'เทรนเนอร์ส่วนตัว', daypass: 'รายวัน' };

const KIND_OPTIONS: DropdownOption[] = [
  { value: 'time', label: PACKAGE_KIND_LABEL.time, description: 'ใช้ยิมได้ตามจำนวนเดือน' },
  { value: 'pt', label: PACKAGE_KIND_LABEL.pt, description: 'นับเป็นจำนวนครั้งที่เทรนกับเทรนเนอร์' },
  { value: 'daypass', label: PACKAGE_KIND_LABEL.daypass, description: 'ใช้ยิมได้ตามจำนวนวัน' },
];

function PackageFields({ pkg, kind, errors, idPrefix }: { pkg?: ManagedPackageDto; kind: PackageKindInput; errors: Record<string, string>; idPrefix: string }) {
  const { unit, max } = DURATION_LIMIT[kind];
  return (
    <>
      <TextField name="name" id={`${idPrefix}-name`} label="ชื่อแพ็กเกจ" placeholder="เช่น รายเดือน 3 เดือน" defaultValue={pkg?.name} autoComplete="off" error={errors.name} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField key={kind} name="duration" id={`${idPrefix}-duration`} label={`ระยะ (${unit})`} type="number" inputMode="numeric" min={1} max={max} step={1} defaultValue={pkg?.duration ?? 1} error={errors.duration} hint={`1–${String(max)} ${unit}`} required />
        <TextField name="price" id={`${idPrefix}-price`} label="ราคา (บาท)" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={pkg ? pkg.priceSatang / 100 : undefined} error={errors.price} required />
      </div>
      <TextField name="description" id={`${idPrefix}-description`} label="รายละเอียด" placeholder="เช่น ใช้ยิมไม่จำกัด + คลาสกลุ่ม" defaultValue={pkg?.description} error={errors.description} required />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="size-5 accent-lime" />
        เปิดขาย <span className="text-muted">(แสดงในหน้าสมัครและหน้าสมาชิก)</span>
      </label>
    </>
  );
}

/** ปิด popup เมื่อบันทึกสำเร็จ (ข้อความสำเร็จแสดงผ่าน ResultMessage) */
function useCloseOnSuccess(state: ActionResult, onDone: () => void): void {
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
}

/** ฟอร์มเพิ่มแพ็กเกจ (ใน popup) — สำเร็จแล้วปิด popup + toast · error คงค่าที่กรอกไว้ */
function PackageCreateForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [kind, setKind] = useState<PackageKindInput>('time');
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Dropdown name="kind" label="ประเภท" options={KIND_OPTIONS} value={kind} onChange={v => { setKind(v as PackageKindInput); }} error={errors.kind} hint="ตั้งแล้วเปลี่ยนภายหลังไม่ได้" />
      <PackageFields kind={kind} errors={errors} idPrefix="new" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มแพ็กเกจ'}</button>
      </div>
    </form>
  );
}

/** ฟอร์มแก้ไขแพ็กเกจ (ใน popup) — ยืนยันก่อนบันทึก · ประเภทเปลี่ยนไม่ได้ · ราคา/ระยะใหม่ใช้กับรายการถัดไป */
function PackageEditForm({ pkg, action, onDone }: { pkg: ManagedPackageDto; action: Action; onDone: () => void }) {
  const { state, submit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ConfirmForm
      onSubmitData={submit}
      confirm={`บันทึกการแก้ไขแพ็กเกจ "${pkg.name}"? ราคาและระยะใหม่ใช้กับการสมัคร/ต่ออายุครั้งถัดไป รายการที่ชำระแล้วไม่เปลี่ยน`}
      confirmTitle="ยืนยันการแก้ไข"
      confirmLabel="บันทึก"
      noValidate
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" value={pkg.id} />
      <input type="hidden" name="kind" value={pkg.kind} />
      <p className="text-sm text-muted">ประเภท: <b className="text-ink">{PACKAGE_KIND_LABEL[pkg.kind]}</b> (เปลี่ยนไม่ได้ — ถ้าต้องการประเภทอื่นให้เพิ่มแพ็กเกจใหม่)</p>
      <PackageFields pkg={pkg} kind={pkg.kind} errors={errors} idPrefix="edit" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
      </div>
    </ConfirmForm>
  );
}

/** ปุ่ม + มุมขวาล่างของกล่องแพ็กเกจ → popup ฟอร์มเพิ่ม */
export function AddPackageButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <AddButton label="เพิ่มแพ็กเกจ" onClick={() => { setOpen(true); }} />
      <FormDialog open={open} onClose={close} title="เพิ่มแพ็กเกจ" subtitle="เปิดขายแล้วจะให้เลือกได้ทันทีตอนสมัครและต่ออายุ">
        <PackageCreateForm action={action} onDone={close} />
      </FormDialog>
    </>
  );
}

const packageDeleteText = (name: string) => `ลบแพ็กเกจ ${name} ถาวร? (ประวัติใน audit log ยังอยู่)`;

/** ปุ่ม ✏️ 🗑 ท้ายแถว · ✏️ เปิด popup แก้ไข · แพ็กเกจที่มีสมาชิกหรือประวัติการชำระไม่มีปุ่มลบ (ปิดขายแทน) */
export function PackageRowActions({ pkg, updateAction, deleteAction }: { pkg: ManagedPackageDto; updateAction: Action; deleteAction?: Action }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => { setOpen(true); }} aria-label={`แก้ไข ${pkg.name}`} title="แก้ไข" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-cyan/10 hover:text-cyan">
        <Pencil aria-hidden className="size-5" />
      </button>
      {deleteAction && <DeleteIconButton label={`ลบ ${pkg.name}`} confirm={packageDeleteText(pkg.name)} confirmLabel="ลบแพ็กเกจ" action={deleteAction} />}
      <FormDialog open={open} onClose={close} title={`แก้ไข ${pkg.name}`} subtitle={`สมาชิกใช้แพ็กเกจนี้ ${String(pkg.memberCount)} คน`}>
        <PackageEditForm pkg={pkg} action={updateAction} onDone={close} />
      </FormDialog>
    </div>
  );
}
