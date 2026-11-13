'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { TrainerDto } from '@/api/types/trainers/trainers/trainers.types';
import { TRAINER_COLORS } from '@/api/schemas/trainers/trainers/trainers.schema';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn, inputClass } from '@/web/components/ui/ui/ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const COLOR_LABEL: Record<(typeof TRAINER_COLORS)[number], string> = {
  'var(--color-lime)': 'สีหลัก',
  'var(--color-cyan)': 'ฟ้า',
  'var(--color-violet)': 'ม่วง',
  'var(--color-warn)': 'เหลือง',
  'var(--color-danger)': 'แดง',
};

function useCloseOnSuccess(state: ActionResult, onDone: () => void): void {
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
}

function TrainerFields({ trainer, errors, idPrefix }: { trainer?: TrainerDto; errors: Record<string, string>; idPrefix: string }) {
  const current = trainer && (TRAINER_COLORS as readonly string[]).includes(trainer.color) ? trainer.color : TRAINER_COLORS[0];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <TextField name="name" id={`${idPrefix}-name`} label="ชื่อ-นามสกุล" placeholder="เช่น ณัฐวุฒิ บุญเลิศ" defaultValue={trainer?.name} autoComplete="off" error={errors.name} required />
        <TextField name="nickname" id={`${idPrefix}-nickname`} label="ชื่อที่แสดง" placeholder="เช่น โค้ชบอส" defaultValue={trainer?.nickname} autoComplete="off" error={errors.nickname} required />
      </div>
      <TextField name="specialties" id={`${idPrefix}-specialties`} label="ความถนัด" placeholder="เช่น HIIT, Yoga, เวทเทรนนิ่ง" defaultValue={trainer?.specialties.join(', ')} hint="คั่นด้วยเครื่องหมายจุลภาค (,) ไม่เกิน 8 อย่าง" error={errors.specialties} optional />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-bio`} className="text-sm font-semibold">แนะนำตัว <span className="font-normal text-faint">(ไม่บังคับ)</span></label>
        <textarea id={`${idPrefix}-bio`} name="bio" rows={3} defaultValue={trainer?.bio} placeholder="ประสบการณ์ จุดเด่น สไตล์การสอน" aria-invalid={errors.bio ? true : undefined} className={`${inputClass} py-3 leading-relaxed`} />
        {errors.bio && <p className="text-sm text-danger">{errors.bio}</p>}
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">สีประจำตัว <span className="font-normal text-faint">(ใช้ในตารางคลาส)</span></legend>
        <div className="flex flex-wrap gap-2">
          {TRAINER_COLORS.map(c => (
            <label key={c} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm text-muted has-[:checked]:border-lime has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
              <input type="radio" name="color" value={c} defaultChecked={c === current} className="sr-only" />
              <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: c }} />
              {COLOR_LABEL[c]}
            </label>
          ))}
        </div>
        {errors.color && <p className="text-sm text-danger">{errors.color}</p>}
      </fieldset>
    </>
  );
}

function TrainerCreateForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TrainerFields errors={errors} idPrefix="new-trainer" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มเทรนเนอร์'}</button>
      </div>
    </form>
  );
}

function TrainerEditForm({ trainer, action, onDone }: { trainer: TrainerDto; action: Action; onDone: () => void }) {
  const { state, submit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ConfirmForm onSubmitData={submit} confirm={`บันทึกการแก้ไขข้อมูล ${trainer.nickname}?`} confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" noValidate className="flex flex-col gap-4">
      <input type="hidden" name="id" value={trainer.id} />
      <TrainerFields trainer={trainer} errors={errors} idPrefix={`edit-${trainer.id}`} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
      </div>
    </ConfirmForm>
  );
}

/** ปุ่มเพิ่มเทรนเนอร์แบบกล่องสำหรับวางด้านบนของรายการ → popup เพิ่มเทรนเนอร์ */
export function AddTrainerButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setOpen(true); }}
          className="group inline-flex min-h-12 items-center gap-2.5 rounded-xl border border-lime/30 bg-lime/5 py-1.5 pr-4 pl-1.5 text-left shadow-sm transition hover:border-lime/60 hover:bg-lime/10 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-lime text-bg shadow-sm transition-transform group-hover:scale-105">
            <Plus aria-hidden className="size-4" />
          </span>
          <span>
            <span className="block font-semibold text-ink">เพิ่มเทรนเนอร์</span>
            <span className="block text-[11px] leading-tight text-muted">สร้างโปรไฟล์ใหม่</span>
          </span>
        </button>
      </div>
      <FormDialog open={open} onClose={close} title="เพิ่มเทรนเนอร์" subtitle="แสดงให้สมาชิกเห็นในหน้าจองคลาสและ PT · ผูกบัญชีเข้าสู่ระบบได้ที่เมนูบัญชีผู้ใช้">
        <TrainerCreateForm action={action} onDone={close} />
      </FormDialog>
    </>
  );
}

function TrainerDeleteForm({ trainer, classCount, replacementOptions, action, onDone }: {
  trainer: TrainerDto;
  classCount: number;
  replacementOptions: { id: string; nickname: string }[];
  action: Action;
  onDone: () => void;
}) {
  const { state, submit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);

  return (
    <ConfirmForm
      onSubmitData={submit}
      confirm={classCount > 0
        ? `ลบโปรไฟล์ ${trainer.nickname} และย้ายตารางคลาส ${String(classCount)} รายการพร้อมผู้จองไปยังเทรนเนอร์ที่เลือก?`
        : `ลบโปรไฟล์เทรนเนอร์ ${trainer.name} ถาวร?`}
      confirmTitle="ยืนยันการลบเทรนเนอร์"
      confirmLabel="ลบเทรนเนอร์"
      confirmTone="danger"
      className="flex flex-col gap-4"
    >
      {classCount > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`replacement-trainer-${trainer.id}`} className="text-sm font-semibold">ย้ายตารางคลาส {String(classCount)} รายการไปให้</label>
          <select
            id={`replacement-trainer-${trainer.id}`}
            name="replacementTrainerId"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>เลือกเทรนเนอร์</option>
            {replacementOptions.map(option => <option key={option.id} value={option.id}>{option.nickname}</option>)}
          </select>
          <p className="text-xs text-muted">ตารางคลาสและรายการจองเดิมจะยังอยู่ โดยเปลี่ยนเฉพาะผู้สอน</p>
        </div>
      )}
      {replacementOptions.length === 0 && classCount > 0 && <p className="text-sm text-danger">ไม่มีเทรนเนอร์คนอื่นให้ย้ายคลาสไป ต้องเพิ่มเทรนเนอร์ก่อน</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending || (classCount > 0 && replacementOptions.length === 0)} className={btn.danger}>{pending ? 'กำลังลบ…' : 'ลบเทรนเนอร์'}</button>
      </div>
    </ConfirmForm>
  );
}

/** ปุ่ม ✏️ 🗑 บนการ์ด — ย้ายคลาสไปยังเทรนเนอร์อื่นก่อนลบ · ประวัติคิว PT ยังบล็อกการลบ */
export function TrainerCardActions({ trainer, updateAction, deleteAction, classCount, ptSessionCount, replacementOptions }: {
  trainer: TrainerDto;
  updateAction: Action;
  deleteAction: Action;
  classCount: number;
  ptSessionCount: number;
  replacementOptions: { id: string; nickname: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const close = () => { setOpen(false); };
  const closeDelete = () => { setDeleteOpen(false); };
  return (
    <div className="relative z-10 flex items-center gap-1">
      <button type="button" onClick={() => { setOpen(true); }} aria-label={`แก้ไข ${trainer.nickname}`} title="แก้ไข" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-cyan/10 hover:text-cyan">
        <Pencil aria-hidden className="size-5" />
      </button>
      {ptSessionCount > 0 ? (
        <span title="ลบไม่ได้ เพราะมีประวัติคิว PT" aria-label="ลบไม่ได้ เพราะมีประวัติคิว PT" className="inline-flex size-11 items-center justify-center rounded-xl text-faint">
          <Trash2 aria-hidden className="size-5" />
        </span>
      ) : (
        <button type="button" onClick={() => { setDeleteOpen(true); }} aria-label={`ลบ ${trainer.nickname}`} title="ลบ" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger">
          <Trash2 aria-hidden className="size-5" />
        </button>
      )}
      <FormDialog open={open} onClose={close} title={`แก้ไข ${trainer.nickname}`}>
        <TrainerEditForm trainer={trainer} action={updateAction} onDone={close} />
      </FormDialog>
      <FormDialog open={deleteOpen} onClose={closeDelete} title={`ลบเทรนเนอร์ ${trainer.nickname}`} subtitle="บัญชีผู้ใช้ที่ผูกไว้จะยังอยู่ แต่จะไม่ระบุเทรนเนอร์">
        <TrainerDeleteForm trainer={trainer} classCount={classCount} replacementOptions={replacementOptions} action={deleteAction} onDone={closeDelete} />
      </FormDialog>
    </div>
  );
}
