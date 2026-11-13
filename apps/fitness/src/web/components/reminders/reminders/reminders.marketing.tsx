'use client';

import { Ban, Banknote, CalendarPlus, Pencil, Percent, TicketPercent } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { renderTemplate, CHANNEL_LABEL, CHANNELS, TEMPLATE_VARS, type Channel, type ReminderRound } from '@/api/services/reminders/reminders/reminders.service';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { DatePickerField } from '@/web/components/ui/ui/ui.calendar';
import { Dropdown } from '@/web/components/ui/ui/ui.dropdown';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { btn, inputClass } from '@/web/components/ui/ui/ui';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import type { CouponDto } from '@/api/types/coupons/coupons/coupons.types';
import { COUPON_TARGET_LABEL, COUPON_TARGETS, type CouponTarget } from '@/api/services/coupons/coupons/coupons.service';

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
    <ConfirmForm action={formAction} confirm="บันทึกการตั้งค่ารอบแจ้งเตือนนี้?" confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" className="flex flex-col gap-4">
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
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
      </div>
    </ConfirmForm>
  );
}

const TYPES = [
  { value: 'percent', label: 'ลดเป็น %', unit: '%', icon: <Percent className="size-4" /> },
  { value: 'baht', label: 'ลดเป็นบาท', unit: 'บาท', icon: <Banknote className="size-4" /> },
  { value: 'days', label: 'แถมวันใช้งาน', unit: 'วัน', icon: <CalendarPlus className="size-4" /> },
] as const;

type PackageOption = { id: string; name: string };

/** ปุ่มสร้างคูปองด้านบนของรายการ → popup สร้างคูปอง */
export function AddCouponButton({ packages, action, today }: { packages: PackageOption[]; action: Action; today: string }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg/60 p-3 sm:px-4">
        <p className="text-sm text-muted">สร้างโค้ดส่วนลดใหม่ เพื่อให้เคาน์เตอร์หรือสมาชิกนำไปใช้ตอนชำระเงิน</p>
        <button type="button" onClick={() => { setOpen(true); }} className={`${btn.primary} shrink-0`}>
          <TicketPercent aria-hidden className="size-4" />
          สร้างคูปอง
        </button>
      </div>
      <FormDialog open={open} onClose={close} title="สร้างคูปอง" subtitle="เคาน์เตอร์ใส่โค้ดตอนรับชำระ · สมาชิกใช้ในแอปได้ (ยกเว้นโค้ดที่ต้องตรวจหลักฐาน)" size="wider">
        <CouponCreateForm packages={packages} action={action} today={today} onDone={close} />
      </FormDialog>
    </>
  );
}

export function EditCouponButton({ coupon, packages, action, today }: { coupon: CouponDto; packages: PackageOption[]; action: Action; today: string }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }} aria-label={`แก้ไขคูปอง ${coupon.code}`} className={`${btn.ghost} min-h-10`}>
        <Pencil aria-hidden className="size-4" />
        แก้ไข
      </button>
      <FormDialog open={open} onClose={close} title={`แก้ไขคูปอง ${coupon.code}`} subtitle="แก้ไขรายละเอียด เงื่อนไข และช่วงวันที่ใช้ได้ · เปลี่ยนรหัสคูปองไม่ได้เพื่อเก็บประวัติการใช้เดิม" size="wider">
        <CouponCreateForm packages={packages} action={action} today={today} onDone={close} coupon={coupon} />
      </FormDialog>
    </>
  );
}

/** ฟอร์มสร้างคูปอง (ใน popup) — สำเร็จแล้วปิด popup + toast · error คงค่าที่กรอกไว้ */
function CouponCreateForm({ packages, action, today, onDone, coupon }: { packages: PackageOption[]; action: Action; today: string; onDone: () => void; coupon?: CouponDto }) {
  const { state, onSubmit, pending } = useFormAction(action);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const [type, setType] = useState<(typeof TYPES)[number]['value']>(coupon?.type ?? 'percent');
  const [appliesTo, setAppliesTo] = useState<CouponTarget[]>(coupon?.appliesTo ?? ['membership']);
  const errors = errorsOf(state);
  const unit = TYPES.find(t => t.value === type)?.unit;
  const defaultValue = coupon ? coupon.type === 'baht' ? coupon.value / 100 : coupon.value : undefined;
  return (
    // จอใหญ่จัดช่องเป็นหลายคอลัมน์เพื่อลดความสูง · จอเล็กเรียงลงคอลัมน์เดียว
    <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-x-4 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-6 [&_label]:text-sm [&_legend]:text-sm [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input]:text-base [&_textarea]:text-base [&_button]:text-sm" noValidate>
      <div className="lg:col-span-2">
        {coupon
          ? <TextField name="code" label="โค้ดคูปอง" defaultValue={coupon.code} readOnly title="รหัสใช้ในประวัติการชำระ จึงเปลี่ยนไม่ได้" className={`${inputClass} uppercase`} />
          : <TextField name="code" label="โค้ด" placeholder="เช่น NEWYEAR15" autoComplete="off" maxLength={40} title="ตัวอักษร A–Z ตัวเลข หรือขีด · 3–40 ตัว" className={`${inputClass} uppercase`} error={errors.code} />}
      </div>
      <div className="lg:col-span-2">
        <TextField name="description" label="คำอธิบาย" placeholder="เช่น โปรปีใหม่" defaultValue={coupon?.description} error={errors.description} />
      </div>
      <fieldset className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
        <legend className="mb-1.5 text-sm font-semibold">ประเภทส่วนลด</legend>
        <div className="min-h-11 overflow-x-auto rounded-xl border border-line bg-bg p-1">
          <div className="grid h-9 w-max grid-flow-col auto-cols-max gap-1">
          {TYPES.map(t => (
            <label key={t.value} className="flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-muted has-[:checked]:bg-surface-2 has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime sm:gap-1.5 sm:px-3 sm:text-sm">
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => {
                setType(t.value);
                if (t.value === 'days') setAppliesTo(['membership']);
              }} className="sr-only" />
              <span aria-hidden className="hidden sm:flex">{t.icon}</span>{t.label}
            </label>
          ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-6">
        <legend className="mb-1.5 text-sm font-semibold">ใช้คูปองกับรายการที่ต้องชำระ</legend>
        <div className="flex flex-wrap gap-2">
          {COUPON_TARGETS.map(target => (
            <label key={target} className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-muted has-[:checked]:border-lime has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
              <input
                type="checkbox"
                name="appliesTo"
                value={target}
                checked={appliesTo.includes(target)}
                disabled={type === 'days' && target !== 'membership'}
                onChange={() => { setAppliesTo(current => current.includes(target) ? current.filter(item => item !== target) : [...current, target]); }}
                className="sr-only"
              />
              {COUPON_TARGET_LABEL[target]}
            </label>
          ))}
        </div>
        {errors.appliesTo && <p className="text-sm text-danger">{errors.appliesTo}</p>}
      </fieldset>

      <div className="lg:col-span-2"><TextField name="value" label={`มูลค่า (${unit ?? ''})`} type="number" inputMode="decimal" min={1} defaultValue={defaultValue} error={errors.value} /></div>
      <div className="lg:col-span-2"><TextField name="limit" label="จำนวนสิทธิ์" type="number" inputMode="numeric" min={1} placeholder="ไม่จำกัด" defaultValue={coupon?.limit ?? ''} error={errors.limit} /></div>
      <div className="lg:col-span-2"><TextField name="perMember" label="ครั้ง/คน" type="number" inputMode="numeric" min={1} defaultValue={coupon?.perMember ?? 1} error={errors.perMember} /></div>
      <div className="lg:col-span-3"><DatePickerField name="startsOn" label="เริ่มใช้วันที่" defaultValue={coupon?.startsOn ?? today} min={coupon ? undefined : today} today={today} required placeholder="เลือกวันเริ่มใช้" error={errors.startsOn} /></div>
      <div className="lg:col-span-3"><DatePickerField name="expiresOn" label="สิ้นสุดวันที่" defaultValue={coupon?.expiresOn ?? undefined} min={coupon ? undefined : today} today={today} optional placeholder="ไม่กำหนดวันสิ้นสุด" error={errors.expiresOn} /></div>

      {appliesTo.includes('membership') && (
        <fieldset className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <legend className="mb-1.5 text-sm font-semibold">จำกัดแพ็กเกจ <span className="font-normal text-faint">(ไม่เลือก = ทุกแพ็กเกจ)</span></legend>
          <div className="flex flex-wrap gap-2">
            {packages.map(p => (
              <label key={p.id} className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-muted has-[:checked]:border-lime has-[:checked]:text-lime has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
                <input type="checkbox" name="packageIds" value={p.id} defaultChecked={coupon?.packageIds?.includes(p.id) ?? false} className="sr-only" />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
        <legend className="mb-1.5 text-sm font-semibold">เงื่อนไข</legend>
        <div className="flex flex-wrap gap-x-5">
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="renewOnly" defaultChecked={coupon?.renewOnly ?? false} className="size-5 accent-lime" />เฉพาะการต่ออายุ</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="newOnly" defaultChecked={coupon?.newOnly ?? false} className="size-5 accent-lime" />เฉพาะสมาชิกใหม่</label>
        </div>
        {errors.renewOnly && <p className="text-sm text-danger">{errors.renewOnly}</p>}
      </fieldset>

      <div className="lg:col-span-2">
        <TextField name="minMemberDays" label="เป็นสมาชิกอย่างน้อย (วัน)" type="number" inputMode="numeric" min={1} placeholder="ไม่จำกัด" title="นับจากวันสมัคร เช่น 30 = เป็นสมาชิกมาแล้ว 30 วันขึ้นไป" defaultValue={coupon?.minMemberDays ?? ''} error={errors.minMemberDays} />
      </div>
      <div className="lg:col-span-2">
        <TextField name="proofRequired" label="หลักฐานที่ต้องตรวจ" placeholder="เช่น บัตรนักเรียน (อายุไม่เกิน 20 ปี)" title="ใส่แล้วเคาน์เตอร์ต้องติ๊ก “ตรวจหลักฐานแล้ว” ก่อนใช้ และสมาชิกใช้เองในแอปไม่ได้" defaultValue={coupon?.proofRequired ?? ''} error={errors.proofRequired} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
        <label htmlFor="coupon-terms" className="text-sm font-semibold">เงื่อนไขเพิ่มเติม</label>
        <textarea id="coupon-terms" name="terms" rows={2} defaultValue={coupon?.terms ?? ''} placeholder="ข้อความที่แสดงตอนใช้โค้ด" aria-invalid={errors.terms ? true : undefined} className={`${inputClass} min-h-14 resize-y py-3 leading-snug`} />
        {errors.terms && <p className="text-sm text-danger">{errors.terms}</p>}
      </div>
      <p className="text-sm text-muted sm:col-span-2 lg:col-span-3 lg:self-center">ช่องที่ว่างไว้ = ไม่จำกัด · ใส่หลักฐานแล้วเคาน์เตอร์ต้องติ๊ก “ตรวจหลักฐานแล้ว” และสมาชิกใช้เองในแอปไม่ได้</p>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={`${btn.secondary} min-h-11 px-5`}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={`${btn.primary} min-h-11 px-5`}>{pending ? (coupon ? 'กำลังบันทึก…' : 'กำลังสร้าง…') : coupon ? 'บันทึกคูปอง' : 'สร้างคูปอง'}</button>
      </div>
    </form>
  );
}
