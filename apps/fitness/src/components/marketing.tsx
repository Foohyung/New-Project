'use client';

import { Ban, Banknote, CalendarPlus, Percent, TicketPercent } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';
import { renderTemplate, CHANNEL_LABEL, CHANNELS, TEMPLATE_VARS, type Channel, type ReminderRound } from '@/features/reminders/service';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { DatePickerField } from './calendar';
import { Dropdown } from './dropdown';
import { TextField } from './field';
import { btn, inputClass } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
const errorsOf = (state: ActionResult) => (state && !state.ok ? (state.fieldErrors ?? {}) : {});

/** ค่าตัวอย่างสำหรับดูข้อความก่อนบันทึก */
const SAMPLE = { ชื่อ: 'พิมพ์ชนก', แพ็กเกจ: 'รายเดือน', วันหมดอายุ: '18 ตุลาคม 2569', ลิงก์ชำระ: 'fitflow.app/me?coupon=…' };

/** แก้รอบแจ้งเตือน: เปิด/ปิด ช่องทาง คูปอง และข้อความ (ดูตัวอย่างสดระหว่างพิมพ์) */
export function RoundEditor({ round, coupons, action }: { round: ReminderRound; coupons: { code: string; label: string }[]; action: Action }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [template, setTemplate] = useState(round.template);
  const [coupon, setCoupon] = useState(round.couponCode ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const errors = errorsOf(state);
  const id = `tpl-${round.id}`;
  const insert = (v: string) => {
    const el = ref.current;
    const token = `{${v}}`;
    if (!el) return;
    const next = template.slice(0, el.selectionStart) + token + template.slice(el.selectionEnd);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = el.selectionStart + token.length;
    });
  };
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
        เปิดใช้รอบนี้
        <input type="checkbox" name="enabled" defaultChecked={round.enabled} role="switch" className="peer sr-only" />
        <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full border border-line bg-surface-2 transition-colors peer-checked:border-lime peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-lime after:absolute after:top-0.5 after:left-0.5 after:size-4.5 after:rounded-full after:bg-muted after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-bg" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">ช่องทาง</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c: Channel) => (
            <label key={c} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted has-[:checked]:border-lime has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
              <input type="checkbox" name="channels" value={c} defaultChecked={round.channels.includes(c)} className="sr-only" />
              {CHANNEL_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <Dropdown
        name="couponCode"
        label="แนบคูปอง"
        value={coupon}
        onChange={setCoupon}
        options={[{ value: '', label: 'ไม่แนบคูปอง', icon: <Ban className="size-4" /> }, ...coupons.map(c => ({ value: c.code, label: c.code, description: c.label, icon: <TicketPercent className="size-4" /> }))]}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold">ข้อความ</label>
        <textarea ref={ref} id={id} name="template" rows={4} value={template} onChange={e => { setTemplate(e.target.value); }} aria-invalid={errors.template ? true : undefined} aria-describedby={`${id}-hint${errors.template ? ` ${id}-err` : ''}`} className={`${inputClass} py-3 leading-relaxed`} />
        <div id={`${id}-hint`} className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          แทรกตัวแปร:
          {TEMPLATE_VARS.map(v => (
            <button key={v} type="button" onClick={() => { insert(v); }} className="min-h-9 rounded-lg border border-line px-2 font-mono text-cyan hover:border-cyan">{`{${v}}`}</button>
          ))}
        </div>
        {errors.template && <p id={`${id}-err`} className="text-sm text-danger">{errors.template}</p>}
      </div>
      <div className="rounded-xl border border-line bg-bg p-3 text-sm">
        <p className="mb-1 text-xs text-faint">ตัวอย่างที่สมาชิกจะได้รับ · {template.length}/300 ตัวอักษร</p>
        <p className="whitespace-pre-wrap">{renderTemplate(template, { ...SAMPLE, คูปอง: coupon || '(ไม่มีคูปอง)' })}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกรอบนี้'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

const TYPES = [
  { value: 'percent', label: 'ลดเป็น %', unit: '%', icon: <Percent className="size-4" /> },
  { value: 'baht', label: 'ลดเป็นบาท', unit: 'บาท', icon: <Banknote className="size-4" /> },
  { value: 'days', label: 'แถมวันใช้งาน', unit: 'วัน', icon: <CalendarPlus className="size-4" /> },
] as const;

export function CouponCreateForm({ packages, action, today }: { packages: { id: string; name: string }[]; action: Action; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await action(prev, fd);
    if (r?.ok) formRef.current?.reset();
    return r;
  }, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('percent');
  const errors = errorsOf(state);
  const unit = TYPES.find(t => t.value === type)?.unit;
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      <TextField name="code" label="โค้ด" placeholder="เช่น NEWYEAR15" autoComplete="off" className={`${inputClass} uppercase`} error={errors.code} hint="ตัวอักษร A–Z ตัวเลข หรือขีด" />
      <TextField name="description" label="คำอธิบาย" placeholder="เช่น โปรปีใหม่" error={errors.description} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">ประเภทส่วนลด</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1">
          {TYPES.map(t => (
            <label key={t.value} className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-muted has-[:checked]:bg-surface-2 has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => { setType(t.value); }} className="sr-only" />
              <span aria-hidden className="hidden sm:flex">{t.icon}</span>{t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <TextField name="value" label={`มูลค่า (${unit ?? ''})`} type="number" inputMode="decimal" min={1} error={errors.value} />
        <TextField name="limit" label="จำนวนสิทธิ์" type="number" inputMode="numeric" min={1} placeholder="ไม่จำกัด" optional error={errors.limit} />
      </div>
      <DatePickerField name="expiresOn" label="หมดเขต" min={today} today={today} optional placeholder="ไม่มีวันหมดเขต" error={errors.expiresOn} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">ใช้กับแพ็กเกจ <span className="font-normal text-faint">(ไม่เลือก = ทุกแพ็กเกจ)</span></legend>
        <div className="flex flex-wrap gap-2">
          {packages.map(p => (
            <label key={p.id} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm text-muted has-[:checked]:border-lime has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
              <input type="checkbox" name="packageIds" value={p.id} className="sr-only" />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1.5 text-sm font-semibold">เงื่อนไข</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="renewOnly" className="size-5 accent-lime" />เฉพาะการต่ออายุ</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="newOnly" className="size-5 accent-lime" />เฉพาะสมาชิกใหม่</label>
        {errors.renewOnly && <p className="text-sm text-danger">{errors.renewOnly}</p>}
        <p className="text-xs text-muted">ใช้ได้ 1 ครั้งต่อสมาชิก 1 คน</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังสร้าง…' : 'สร้างคูปอง'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}
