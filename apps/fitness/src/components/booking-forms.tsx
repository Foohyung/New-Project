'use client';

import { useActionState, useRef } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { TextField } from './field';
import { btn, inputClass } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const errorsOf = (state: ActionResult) => (state && !state.ok ? (state.fieldErrors ?? {}) : {});

/** เจ้าหน้าที่จองคลาสให้สมาชิกด้วยเบอร์โทรหรือรหัสสมาชิก */
export function BookForMemberForm({ action, disabled, disabledReason }: { action: Action; disabled?: boolean; disabledReason?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = errorsOf(state);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
      <TextField name="query" label="เบอร์โทรหรือรหัสสมาชิก" placeholder="เช่น 080-000-0102 หรือ FF-001842" autoComplete="off" disabled={disabled} error={errors.query} hint={disabled ? disabledReason : 'ระบบตรวจสถานะสมาชิกและที่นั่งว่างให้อัตโนมัติ'} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || disabled} className={btn.primary}>{pending ? 'กำลังจอง…' : 'จองให้สมาชิก'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

/** จองเทรนเนอร์ส่วนตัว */
export function PtBookForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = errorsOf(state);
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <TextField name="query" label="เบอร์โทรหรือรหัสสมาชิก" placeholder="เช่น FF-002107" autoComplete="off" error={errors.query} hint="ลอง FF-002107 (เหลือ 3 ครั้ง) หรือ FF-000958 (เหลือ 5 ครั้ง)" />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="date" label="วันที่" type="date" min={today} defaultValue={today} error={errors.date} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="time" className="text-sm font-semibold">เวลาเริ่ม</label>
          <select id="time" name="time" defaultValue="19:00" className={inputClass}>
            {Array.from({ length: 15 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`).map(t => <option key={t} value={t}>{t} น.</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังจอง…' : 'จอง PT 60 นาที'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

/** สร้างคลาสใหม่ (ผู้จัดการ) */
export function ClassCreateForm({ action, trainers, rooms, today }: { action: Action; trainers: { id: string; nickname: string }[]; rooms: string[]; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = errorsOf(state);
  return (
    <form action={formAction} className="grid max-w-3xl gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 md:grid-cols-2" noValidate>
      <TextField name="title" label="ชื่อคลาส" placeholder="เช่น Morning HIIT" error={errors.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="trainerId" className="text-sm font-semibold">เทรนเนอร์</label>
        <select id="trainerId" name="trainerId" className={inputClass} aria-invalid={errors.trainerId ? true : undefined}>
          {trainers.map(t => <option key={t.id} value={t.id}>{t.nickname}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="room" className="text-sm font-semibold">ห้อง</label>
        <input id="room" name="room" list="rooms" defaultValue={rooms[0]} className={inputClass} aria-invalid={errors.room ? true : undefined} />
        <datalist id="rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
        {errors.room && <p className="text-sm text-danger">{errors.room}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="level" className="text-sm font-semibold">ระดับ</label>
        <select id="level" name="level" defaultValue="กลาง" className={inputClass}>
          {['ง่าย', 'กลาง', 'หนัก'].map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      <TextField name="date" label="วันที่" type="date" min={today} defaultValue={today} error={errors.date} />
      <TextField name="time" label="เวลาเริ่ม" type="time" defaultValue="17:00" step={900} error={errors.time} />
      <TextField name="minutes" label="ความยาว (นาที)" type="number" inputMode="numeric" min={30} max={120} defaultValue={45} error={errors.minutes} />
      <TextField name="capacity" label="รับได้ (คน)" type="number" inputMode="numeric" min={1} max={60} defaultValue={20} error={errors.capacity} />
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'เพิ่มคลาส'}</button>
        <ResultMessage state={state && !state.ok ? state : null} />
      </div>
    </form>
  );
}
