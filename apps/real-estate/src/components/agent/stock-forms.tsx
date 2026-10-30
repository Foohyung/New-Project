'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { addUnitAction, createClientAction, createOwnerAction, createPropertyAction, updateOwnerAction, updateStatusAction } from '@/features/stock/actions';
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPES, UNIT_STATUS_LABEL, UNIT_STATUSES, OWNER_LISTING_LABEL, OWNER_STATUS_LABEL, type Owner, type UnitStatus } from '@/features/stock/types';
import { DatePickerField } from './calendar';
import { Dropdown } from './dropdown';
import { TextField } from './field';
import { btn, inputClass } from './ui';
import { useFormAction } from './use-form-action';

export function ResultMessage({ state }: { state: ActionResult }) {
  if (!state) return <span aria-live="polite" className="sr-only" />;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={`rounded-xl px-3 py-2 text-sm ${state.ok ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>
      {state.message}
      {state.ok && state.href && <> <Link href={state.href} className="font-semibold underline">เปิดดู</Link></>}
    </p>
  );
}

const errorsOf = (state: ActionResult) => (state && !state.ok ? (state.fieldErrors ?? {}) : {});

/** ช่องข้อมูลยูนิต: ขนาด เจ้าของ ราคา สถานะ และค่าคอมที่ตกลง (ใช้ทั้งตอนเพิ่มทรัพย์และเพิ่มยูนิต) */
function UnitFields({ owners, errors, defaultOwner }: { owners: Pick<Owner, 'id' | 'name' | 'phone'>[]; errors: Record<string, string>; defaultOwner?: string }) {
  const [kind, setKind] = useState('percent');
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="label" label="เลขห้อง / ยูนิต" placeholder="เช่น 12A01 หรือ ทั้งหลัง" defaultValue="ทั้งหลัง" error={errors.label} />
        <Dropdown name="ownerId" label="เจ้าของ" defaultValue={defaultOwner ?? owners[0]?.id} options={owners.map(o => ({ value: o.id, label: o.name, description: o.phone }))} error={errors.ownerId} hint={<>ยังไม่มีในรายการ? <Link href="/agent/owners/new" className="font-semibold text-accent underline">เพิ่มเจ้าของ</Link></>} />
        <TextField name="bedrooms" label="ห้องนอน" inputMode="numeric" defaultValue="0" error={errors.bedrooms} />
        <TextField name="areaSqm" label="พื้นที่ใช้สอย (ตร.ม.)" inputMode="numeric" error={errors.areaSqm} />
        <TextField name="landSqWah" label="ที่ดิน (ตร.ว.)" inputMode="numeric" optional error={errors.landSqWah} />
        <Dropdown name="status" label="สถานะ" defaultValue="available" options={UNIT_STATUSES.map(s => ({ value: s, label: UNIT_STATUS_LABEL[s] }))} error={errors.status} />
        <TextField name="salePrice" label="ราคาขาย (บาท)" inputMode="decimal" placeholder="เว้นว่างถ้าไม่ขาย" error={errors.salePrice} />
        <TextField name="rentPrice" label="ค่าเช่าต่อเดือน (บาท)" inputMode="decimal" placeholder="เว้นว่างถ้าไม่ให้เช่า" error={errors.rentPrice} />
      </div>
      <fieldset className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">ค่าคอมที่ตกลงกับเจ้าของ</legend>
        <Dropdown
          name="commissionKind"
          label="รูปแบบ"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'percent', label: 'เปอร์เซ็นต์ของราคาขาย', description: 'ปกติ 3%' },
            { value: 'months', label: 'จำนวนเดือนของค่าเช่า', description: 'ปกติ 1 เดือน (สัญญา 1 ปี)' },
            { value: 'fixed', label: 'เหมาจ่าย (บาท)', description: 'ตกลงเป็นจำนวนเงิน' },
          ]}
        />
        <TextField name="commissionValue" label={kind === 'percent' ? 'อัตรา (%)' : kind === 'months' ? 'จำนวนเดือน' : 'จำนวนเงิน (บาท)'} inputMode="decimal" defaultValue={kind === 'fixed' ? '' : kind === 'months' ? '1' : '3'} key={kind} error={errors.commissionValue} />
        <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
          <input type="checkbox" name="exclusive" className="size-5 accent-accent" />
          <span>แต่งตั้งรายเดียว (Exclusive)</span>
        </label>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">หมายเหตุ <span className="font-normal text-faint">(ไม่บังคับ)</span></span>
        <textarea name="note" rows={2} className={`${inputClass} py-3`} />
      </label>
    </>
  );
}

export function PropertyForm({ owners }: { owners: Pick<Owner, 'id' | 'name' | 'phone'>[] }) {
  const { state, onSubmit, pending } = useFormAction(createPropertyAction);
  const errors = errorsOf(state);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-bold">ข้อมูลทรัพย์</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="ชื่อทรัพย์ / โครงการ" placeholder="เช่น คอนโด เดอะ ไลน์ อารีย์" error={errors.name} />
          <Dropdown name="type" label="ประเภท" defaultValue="condo" options={PROPERTY_TYPES.map(t => ({ value: t, label: PROPERTY_TYPE_LABEL[t] }))} error={errors.type} />
          <TextField name="location" label="ที่ตั้ง" placeholder="ถนน แขวง/ตำบล เขต/อำเภอ" error={errors.location} />
          <TextField name="province" label="จังหวัด" defaultValue="กรุงเทพมหานคร" error={errors.province} />
          <div className="sm:col-span-2"><TextField name="deed" label="เอกสารสิทธิ์" placeholder="เช่น โฉนดที่ดินเลขที่ 45871 / อช.2 เลขที่ 12/2560" error={errors.deed} /></div>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-bold">ยูนิตแรก</h2>
        <p className="-mt-2 text-sm text-muted">คอนโด/อาคารหลายห้องเพิ่มห้องอื่นได้ในหน้าทรัพย์หลังบันทึก</p>
        <UnitFields owners={owners} errors={errors} />
      </section>
      <ResultMessage state={state} />
      <button type="submit" disabled={pending} className={`${btn.primary} sm:self-start`}>{pending ? 'กำลังบันทึก…' : 'บันทึกทรัพย์'}</button>
    </form>
  );
}

export function AddUnitForm({ propertyId, owners, defaultOwner }: { propertyId: string; owners: Pick<Owner, 'id' | 'name' | 'phone'>[]; defaultOwner?: string }) {
  const { state, onSubmit, pending } = useFormAction(addUnitAction.bind(null, propertyId));
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <UnitFields owners={owners} errors={errorsOf(state)} defaultOwner={defaultOwner} />
      <ResultMessage state={state} />
      <button type="submit" disabled={pending} className={`${btn.primary} sm:self-start`}>{pending ? 'กำลังบันทึก…' : 'เพิ่มยูนิต'}</button>
    </form>
  );
}

/** เปลี่ยนสถานะยูนิต — ถ้าเป็น "เช่าแล้ว" ต้องใส่วันสิ้นสุดสัญญาเช่า */
export function StatusForm({ unitId, status, leaseEnd, today }: { unitId: string; status: UnitStatus; leaseEnd: string | null; today: string }) {
  const { state, onSubmit, pending } = useFormAction(updateStatusAction);
  const [value, setValue] = useState<string>(status);
  const errors = errorsOf(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="unitId" value={unitId} />
      <div className="flex flex-wrap items-end gap-2">
        <Dropdown name="status" label="สถานะ" value={value} onChange={setValue} options={UNIT_STATUSES.map(s => ({ value: s, label: UNIT_STATUS_LABEL[s] }))} className="min-w-36 flex-1" />
        {value === 'rented' && <div className="min-w-44 flex-1"><DatePickerField name="leaseEnd" label="เช่าถึงวันที่" defaultValue={leaseEnd ?? undefined} min={today} today={today} error={errors.leaseEnd} /></div>}
        <button type="submit" disabled={pending} className={btn.secondary}>{pending ? 'กำลังบันทึก…' : 'บันทึกสถานะ'}</button>
      </div>
      <ResultMessage state={state} />
    </form>
  );
}

function OwnerFields({ owner, errors }: { owner?: Owner; errors: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="name" label="ชื่อ-นามสกุล / ชื่อนิติบุคคล" defaultValue={owner?.name} error={errors.name} />
      <Dropdown name="kind" label="ประเภท" defaultValue={owner?.kind ?? 'person'} options={[{ value: 'person', label: 'บุคคลธรรมดา' }, { value: 'company', label: 'นิติบุคคล', description: 'ต้องมีหนังสือมอบอำนาจผู้ลงนาม' }]} />
      <TextField name="phone" label="เบอร์โทร" type="tel" autoComplete="off" defaultValue={owner?.phone} error={errors.phone} />
      <TextField name="lineId" label="LINE ID" optional defaultValue={owner?.lineId} error={errors.lineId} />
      <TextField name="email" label="อีเมล" type="email" optional defaultValue={owner?.email} error={errors.email} />
      <TextField name="taxId" label="เลขบัตรประชาชน / ทะเบียนนิติบุคคล" defaultValue={owner?.taxId} hint="ใช้เติมในสัญญา — แสดงแบบซ่อนในหน้าอื่น" error={errors.taxId} />
      <div className="sm:col-span-2"><TextField name="address" label="ที่อยู่ตามบัตร/ทะเบียน" defaultValue={owner?.address} error={errors.address} /></div>
      <Dropdown name="listing" label="ฝากอะไร" defaultValue={owner?.listing ?? 'sale'} options={(['sale', 'rent', 'both'] as const).map(v => ({ value: v, label: OWNER_LISTING_LABEL[v] }))} />
      <Dropdown name="status" label="สถานะ" defaultValue={owner?.status ?? 'active'} options={(['active', 'paused', 'ended'] as const).map(v => ({ value: v, label: OWNER_STATUS_LABEL[v] }))} />
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-sm font-semibold">หมายเหตุ <span className="font-normal text-faint">(ไม่บังคับ)</span></span>
        <textarea name="note" rows={2} defaultValue={owner?.note} className={`${inputClass} py-3`} />
      </label>
    </div>
  );
}

export function OwnerForm({ owner }: { owner?: Owner }) {
  const { state, onSubmit, pending } = useFormAction(owner ? updateOwnerAction.bind(null, owner.id) : createOwnerAction);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <OwnerFields owner={owner} errors={errorsOf(state)} />
      <ResultMessage state={state} />
      <button type="submit" disabled={pending} className={`${btn.primary} sm:self-start`}>{pending ? 'กำลังบันทึก…' : owner ? 'บันทึกการแก้ไข' : 'เพิ่มเจ้าของ'}</button>
    </form>
  );
}

export function ClientForm() {
  const { state, onSubmit, pending } = useFormAction(createClientAction);
  const errors = errorsOf(state);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="ชื่อลูกค้า" error={errors.name} />
        <TextField name="phone" label="เบอร์โทร" type="tel" error={errors.phone} />
        <TextField name="idNumber" label="เลขบัตร / พาสปอร์ต" error={errors.idNumber} />
        <Dropdown name="interest" label="สนใจ" defaultValue="buy" options={[{ value: 'buy', label: 'ซื้อ' }, { value: 'rent', label: 'เช่า' }]} />
        <div className="sm:col-span-2"><TextField name="address" label="ที่อยู่" error={errors.address} /></div>
      </div>
      <ResultMessage state={state} />
      <button type="submit" disabled={pending} className={`${btn.primary} sm:self-start`}>{pending ? 'กำลังบันทึก…' : 'เพิ่มลูกค้า'}</button>
    </form>
  );
}
