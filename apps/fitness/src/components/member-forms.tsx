'use client';

import { addDays, formatBaht, formatThaiDate, formatThaiMobile } from '@repo/utils';
import { useActionState, useState } from 'react';
import { FREEZE_MAX_DAYS, membershipPeriod, type PackageLike } from '@/features/members/service';
import { METHOD_LABEL, type PaymentMethod } from '@/features/payments/service';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { ChoiceCard, FieldError, TextField } from './field';
import { btn, inputClass } from './ui';

export interface PackageOption extends PackageLike {
  id: string;
  name: string;
  priceSatang: number;
  durationLabel: string;
  description: string;
}

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
const METHODS: PaymentMethod[] = ['cash', 'card', 'promptpay', 'transfer'];

function errorsOf(state: ActionResult): Record<string, string> {
  return state && !state.ok ? (state.fieldErrors ?? {}) : {};
}

function PackagePicker({ packages, value, onChange, error }: { packages: PackageOption[]; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? 'packageId-error' : undefined}>
      <legend className="mb-1.5 text-sm font-semibold">แพ็กเกจ</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {packages.map(p => (
          <ChoiceCard key={p.id} name="packageId" value={p.id} checked={value === p.id} onChange={onChange} title={p.name} detail={`${p.durationLabel} · ${p.description}`} aside={<b className="font-display whitespace-nowrap">{formatBaht(p.priceSatang)}</b>} />
        ))}
      </div>
      <FieldError id="packageId-error" error={error} />
    </fieldset>
  );
}

function MethodPicker({ value, onChange, error }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">วิธีชำระเงิน</legend>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {METHODS.map(m => (
          <ChoiceCard key={m} name="method" value={m} checked={value === m} onChange={v => {
            onChange(v as PaymentMethod);
          }} title={METHOD_LABEL[m]} detail={m === 'cash' || m === 'card' ? 'ยืนยันทันที' : 'รอตรวจสลิป'} />
        ))}
      </div>
      <FieldError id="method-error" error={error} />
    </fieldset>
  );
}

/** สมัครสมาชิกใหม่ที่เคาน์เตอร์ */
export function MemberCreateForm({ packages, action, today }: { packages: PackageOption[]; action: Action; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [packageId, setPackageId] = useState(packages[0]?.id ?? '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const errors = errorsOf(state);
  const pkg = packages.find(p => p.id === packageId);
  const period = pkg && membershipPeriod(pkg, null, today);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" noValidate>
      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold">ข้อมูลสมาชิก</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="name" label="ชื่อ-นามสกุล" autoComplete="name" required error={errors.name} />
          <TextField name="phone" label="เบอร์มือถือ" type="tel" inputMode="tel" autoComplete="tel" placeholder="08X-XXX-XXXX" required error={errors.phone} hint="ใช้เช็กอินและรับแจ้งเตือนทาง LINE" />
          <TextField name="email" label="อีเมล" type="email" autoComplete="email" optional error={errors.email} />
          <TextField name="note" label="หมายเหตุ" optional placeholder="เช่น เป้าหมายการออกกำลังกาย" error={errors.note} />
        </div>
        <PackagePicker packages={packages} value={packageId} onChange={setPackageId} error={errors.packageId} />
        <MethodPicker value={method} onChange={setMethod} error={errors.method} />
      </div>

      <aside className="flex flex-col gap-4 self-start rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-6">
        <h2 className="font-display text-lg font-semibold">สรุปรายการ</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">แพ็กเกจ</dt><dd>{pkg?.name ?? '—'}</dd></div>
          {period && <div className="flex justify-between gap-3"><dt className="text-muted">ใช้ได้</dt><dd className="text-right">{formatThaiDate(period.startsOn)} – {formatThaiDate(period.expiresOn)}</dd></div>}
          {pkg?.kind === 'pt' && <div className="flex justify-between gap-3"><dt className="text-muted">ครั้ง PT</dt><dd>{pkg.sessions} ครั้ง</dd></div>}
          <div className="flex justify-between gap-3"><dt className="text-muted">ชำระด้วย</dt><dd>{METHOD_LABEL[method]}</dd></div>
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-3"><dt className="font-semibold">ยอดชำระ</dt><dd className="font-display text-2xl font-semibold text-lime">{pkg ? formatBaht(pkg.priceSatang) : '—'}</dd></div>
        </dl>
        {pkg?.kind === 'pt' && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">แพ็กเกจ PT ไม่รวมสิทธิ์เข้ายิม ควรสมัครคู่กับแพ็กเกจรายเดือน</p>}
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required aria-invalid={errors.consent ? true : undefined} aria-describedby="consent-error" className="mt-1 size-5 shrink-0 accent-lime" />
          <span>สมาชิกยินยอมให้เก็บชื่อ เบอร์โทร และประวัติการใช้บริการ เพื่อใช้สิทธิ์สมาชิกและรับแจ้งเตือน ตามนโยบายความเป็นส่วนตัว</span>
        </label>
        <FieldError id="consent-error" error={errors.consent} />
        <button type="submit" disabled={pending} className={`${btn.primary} min-h-12 w-full`}>
          {pending ? 'กำลังบันทึก…' : method === 'cash' || method === 'card' ? 'รับเงินและสมัครสมาชิก' : 'สมัครและสร้าง QR ชำระเงิน'}
        </button>
        <ResultMessage state={state && !state.ok ? state : null} />
      </aside>
    </form>
  );
}

/** แก้ไขข้อมูลติดต่อ */
export function MemberEditForm({ member, action }: { member: { name: string; phone: string; email: string | null; note: string | null }; action: Action }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = errorsOf(state);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label="ชื่อ-นามสกุล" defaultValue={member.name} autoComplete="name" error={errors.name} />
        <TextField name="phone" label="เบอร์มือถือ" type="tel" inputMode="tel" defaultValue={formatThaiMobile(member.phone)} autoComplete="tel" error={errors.phone} />
        <TextField name="email" label="อีเมล" type="email" defaultValue={member.email ?? ''} optional error={errors.email} />
        <TextField name="note" label="หมายเหตุ" defaultValue={member.note ?? ''} optional error={errors.note} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.secondary}>{pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

/** ต่ออายุ / ซื้อแพ็กเกจเพิ่ม */
export function RenewForm({ packages, action, currentExpiresOn, today }: { packages: PackageOption[]; action: Action; currentExpiresOn: string; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [packageId, setPackageId] = useState(packages[0]?.id ?? '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const errors = errorsOf(state);
  const pkg = packages.find(p => p.id === packageId);
  const period = pkg && membershipPeriod(pkg, currentExpiresOn, today);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PackagePicker packages={packages} value={packageId} onChange={setPackageId} error={errors.packageId} />
      <MethodPicker value={method} onChange={setMethod} error={errors.method} />
      <p className="rounded-xl bg-surface-2 p-3 text-sm">
        {pkg?.kind === 'pt' ? `เพิ่มครั้ง PT อีก ${String(pkg.sessions ?? 0)} ครั้ง` : period ? `หลังชำระ ใช้ได้ถึง ${formatThaiDate(period.expiresOn, 'long')}${currentExpiresOn >= today ? ' (ต่อจากวันหมดอายุเดิม)' : ''}` : 'เลือกแพ็กเกจ'}
        {pkg && <b className="float-right font-display text-lime">{formatBaht(pkg.priceSatang)}</b>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'ยืนยันการต่ออายุ'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}

const FREEZE_OPTIONS = [7, 14, 30, 45, FREEZE_MAX_DAYS];

export function FreezeForm({ action, expiresOn, today }: { action: Action; expiresOn: string; today: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [days, setDays] = useState(14);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="days" className="text-sm font-semibold">จำนวนวันที่พัก</label>
      <select id="days" name="days" value={days} onChange={e => {
          setDays(Number(e.target.value));
        }} className={inputClass}>
        {FREEZE_OPTIONS.map(d => <option key={d} value={d}>{d} วัน</option>)}
      </select>
      <p className="text-sm text-muted">พักถึง {formatThaiDate(addDays(today, days - 1))} · วันหมดอายุเลื่อนเป็น {formatThaiDate(addDays(expiresOn, days))} · ระหว่างพักเช็กอินไม่ได้</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.secondary}>{pending ? 'กำลังบันทึก…' : 'พักสมาชิก'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}
