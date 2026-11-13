'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { CourseDto } from '@/api/types/courses/courses/courses.types';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { DatePickerField } from '@/web/components/ui/ui/ui.calendar';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';
import { Dropdown } from '@/web/components/ui/ui/ui.dropdown';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn, inputClass } from '@/web/components/ui/ui/ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
export type TrainerOption = { id: string; name: string };

function useCloseOnSuccess(state: ActionResult, onDone: () => void): void {
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
}

function CourseFields({ course, trainers, today, errors, idPrefix }: { course?: CourseDto; trainers: TrainerOption[]; today: string; errors: Record<string, string>; idPrefix: string }) {
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-3">
        <TextField name="title" id={`${idPrefix}-title`} label="ชื่อคอร์ส" placeholder="เช่น มวยไทยพื้นฐาน 8 ครั้ง" defaultValue={course?.title} autoComplete="off" error={errors.title} required />
      </div>
      <Dropdown name="trainerId" label="ผู้สอน" defaultValue={course?.trainerId ?? ''} options={[{ value: '', label: 'ไม่ระบุ' }, ...trainers.map(t => ({ value: t.id, label: t.name }))]} error={errors.trainerId} />
      <TextField name="room" id={`${idPrefix}-room`} label="ห้อง" placeholder="เช่น Studio A" defaultValue={course?.room ?? ''} error={errors.room} optional />
      <TextField name="schedule" id={`${idPrefix}-schedule`} label="วันและเวลาเรียน" placeholder="เช่น จ./พ. 18:00–19:00" defaultValue={course?.schedule} error={errors.schedule} required />
      <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
        <DatePickerField name="startsOn" label="วันเริ่มเรียน" defaultValue={course?.startsOn ?? today} today={today} error={errors.startsOn} />
        <DatePickerField name="endsOn" label="วันจบคอร์ส" defaultValue={course?.endsOn ?? ''} today={today} error={errors.endsOn} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
        <TextField name="sessions" id={`${idPrefix}-sessions`} label="จำนวนครั้ง" type="number" inputMode="numeric" min={1} step={1} defaultValue={course?.sessions ?? 8} error={errors.sessions} required />
        <TextField name="capacity" id={`${idPrefix}-capacity`} label="ที่นั่ง" type="number" inputMode="numeric" min={1} step={1} defaultValue={course?.capacity ?? 12} error={errors.capacity} required />
        <TextField name="price" id={`${idPrefix}-price`} label="ราคา (บาท)" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={course ? course.priceSatang / 100 : undefined} error={errors.price} required />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
        <label htmlFor={`${idPrefix}-description`} className="text-sm font-semibold">รายละเอียด <span className="font-normal text-faint">(ไม่บังคับ)</span></label>
        <textarea id={`${idPrefix}-description`} name="description" rows={2} defaultValue={course?.description ?? ''} placeholder="เรียนอะไร เหมาะกับใคร ต้องเตรียมอะไรมา" aria-invalid={errors.description ? true : undefined} className={`${inputClass} py-3 leading-relaxed`} />
        {errors.description && <p className="text-sm text-danger">{errors.description}</p>}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="active" defaultChecked={course?.active ?? true} className="size-5 accent-lime" />
        เปิดรับสมัคร <span className="text-muted">(แสดงให้สมาชิกสมัครเองในพอร์ทัล)</span>
      </label>
    </div>
  );
}

function CourseCreateForm({ action, trainers, today, onDone }: { action: Action; trainers: TrainerOption[]; today: string; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <CourseFields trainers={trainers} today={today} errors={errors} idPrefix="new-course" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มคอร์ส'}</button>
      </div>
    </form>
  );
}

function CourseEditForm({ course, action, trainers, today, onDone }: { course: CourseDto; action: Action; trainers: TrainerOption[]; today: string; onDone: () => void }) {
  const { state, submit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ConfirmForm onSubmitData={submit} confirm={`บันทึกการแก้ไขคอร์ส "${course.title}"? ราคาใหม่ใช้กับผู้สมัครคนถัดไป ผู้ที่สมัครแล้วจ่ายราคาเดิม`} confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" noValidate className="flex flex-col gap-3">
      <input type="hidden" name="id" value={course.id} />
      <CourseFields course={course} trainers={trainers} today={today} errors={errors} idPrefix={`edit-${course.id}`} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
      </div>
    </ConfirmForm>
  );
}

/** ปุ่มเพิ่มคอร์สในหัวข้อรายการ → popup เพิ่มคอร์ส */
export function AddCourseButton({ action, trainers, today }: { action: Action; trainers: TrainerOption[]; today: string }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }} className={btn.primary}>
        <Plus aria-hidden className="size-4" />
        เพิ่มคอร์ส
      </button>
      <FormDialog open={open} onClose={close} title="เพิ่มคอร์สเรียน" subtitle="เปิดรับสมัครแล้วสมาชิกสมัครเองได้ทันทีที่เมนูคอร์สเรียน" size="wide">
        <CourseCreateForm action={action} trainers={trainers} today={today} onDone={close} />
      </FormDialog>
    </>
  );
}

const courseDeleteText = (title: string) => `ลบคอร์ส ${title} ถาวร? (ประวัติใน audit log ยังอยู่)`;

/** ปุ่ม ✏️ 🗑 ท้ายแถว · ✏️ เปิด popup · คอร์สที่เคยมีผู้สมัครไม่มีปุ่มลบ (ปิดรับสมัครแทน) */
export function CourseRowActions({ course, trainers, today, updateAction, deleteAction }: { course: CourseDto; trainers: TrainerOption[]; today: string; updateAction?: Action; deleteAction?: Action }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <div className="flex items-center gap-1">
      {updateAction && (
        <button type="button" onClick={() => { setOpen(true); }} aria-label={`แก้ไข ${course.title}`} title="แก้ไข" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-cyan/10 hover:text-cyan">
          <Pencil aria-hidden className="size-5" />
        </button>
      )}
      {deleteAction && <DeleteIconButton label={`ลบ ${course.title}`} confirm={courseDeleteText(course.title)} confirmLabel="ลบคอร์ส" action={deleteAction} />}
      {updateAction && (
        <FormDialog open={open} onClose={close} title={`แก้ไข ${course.title}`} subtitle={`สมัครแล้ว ${String(course.taken)}/${String(course.capacity)} ที่`} size="wide">
          <CourseEditForm course={course} action={updateAction} trainers={trainers} today={today} onDone={close} />
        </FormDialog>
      )}
    </div>
  );
}
