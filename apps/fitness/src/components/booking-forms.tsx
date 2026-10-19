'use client';

import { Clock } from 'lucide-react';
import { useActionState, useRef } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { Dropdown } from './dropdown';
import { TextField } from './field';
import { btn, inputClass } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const errorsOf = (state: ActionResult) => (state && !state.ok ? (state.fieldErrors ?? {}) : {});

/** คิว PT เริ่มได้ 06:00–20:00 (จบไม่เกิน 21:00) */
const PT_TIMES = Array.from({ length: 15 }, (_, i) => {
  const hour = 6 + i;
  return { value: `${String(hour).padStart(2, '0')}:00`, label: `${String(hour).padStart(2, '0')}:00 น.`, description: hour < 12 ? 'ช่วงเช้า' : hour < 17 ? 'ช่วงบ่าย' : 'ช่วงเย็น (คนเยอะ)', icon: <Clock className="size-4" /> };
});

const dot = (color: string) => <span className={`size-2.5 rounded-full ${color}`} />;
const LEVELS = [
  { value: 'ง่าย', label: 'ง่าย', description: 'มือใหม่ทำตามได้', icon: dot('bg-lime') },
  { value: 'กลาง', label: 'กลาง', description: 'มีพื้นฐานการออกกำลังกาย', icon: dot('bg-warn') },
  { value: 'หนัก', label: 'หนัก', description: 'เข้มข้น เหมาะกับผู้ฝึกประจำ', icon: dot('bg-danger') },
];

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
        <Dropdown name="time" label="เวลาเริ่ม" defaultValue="19:00" options={PT_TIMES} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังจอง…' : 'จอง PT 60 นาที'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

/** สร้างคลาสใหม่ (ผู้จัดการ) */
export function ClassCreateForm({ action, trainers, rooms, today }: { action: Action; trainers: { id: string; nickname: string; specialties: string[]; color: string }[]; rooms: string[]; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = errorsOf(state);
  return (
    <form action={formAction} className="grid max-w-3xl gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 md:grid-cols-2" noValidate>
      <TextField name="title" label="ชื่อคลาส" placeholder="เช่น Morning HIIT" error={errors.title} />
      <Dropdown
        name="trainerId"
        label="เทรนเนอร์"
        error={errors.trainerId}
        options={trainers.map(t => ({ value: t.id, label: t.nickname, description: t.specialties.join(' · '), icon: <span className="size-3 rounded-full" style={{ backgroundColor: t.color }} /> }))}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="room" className="text-sm font-semibold">ห้อง</label>
        <input id="room" name="room" list="rooms" defaultValue={rooms[0]} className={inputClass} aria-invalid={errors.room ? true : undefined} />
        <datalist id="rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
        {errors.room && <p className="text-sm text-danger">{errors.room}</p>}
      </div>
      <Dropdown name="level" label="ระดับ" defaultValue="กลาง" options={LEVELS} />
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
