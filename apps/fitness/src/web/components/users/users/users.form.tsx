'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useState } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { ManagedUser, UserOptions } from '@/api/types/users/users/users.types';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { btn } from '@/web/components/ui/ui/ui';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { DatePickerField } from '@/web/components/ui/ui/ui.calendar';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';

import { Dropdown, type DropdownOption } from '@/web/components/ui/ui/ui.dropdown';

/** ฟอร์มเพิ่มบัญชี · ส่ง `user` มา = โหมดแก้ไข (admin) รหัสผ่านเว้นว่างได้ และมีสถานะเปิด/ปิดใช้งาน */
export function ManagedUserForm({
  branch,
  options,
  canManageRoles,
  action,
  today,
  user,
}: {
  branch: string;
  options: UserOptions;
  canManageRoles: boolean;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  today: string;
  user?: ManagedUser;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const editing = Boolean(user);
  const [role, setRole] = useState(user?.role ?? options.roles.find(value => value.id === 'manager')?.id ?? options.roles[0]?.id ?? '');
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const systemRoles = options.roles.filter(value => value.system);
  const customRoles = options.roles.filter(value => !value.system);

  const roleOptions: DropdownOption[] = [
    ...systemRoles.map(value => ({
      value: value.id,
      label: value.name,
      description: 'บทบาทระบบ',
    })),
    ...customRoles.map(value => ({
      value: value.id,
      label: value.name,
      description: 'บทบาทที่สร้างเอง',
    })),
  ];

  const roleHint = customRoles.length === 0 ? (
    <>
      ยังไม่มีบทบาทที่สร้างเอง
      {canManageRoles && <> · <Link href="/roles" className="underline underline-offset-2">สร้างบทบาทที่หน้าจัดการบทบาท</Link></>}
    </>
  ) : (
    'บทบาทที่สร้างเองเลือกได้ในกลุ่ม “บทบาทที่สร้างเอง”'
  );

  return (
    <ConfirmForm
      action={formAction}
      confirm={user ? `บันทึกการแก้ไขบัญชี ${user.name}?` : undefined}
      confirmTitle="ยืนยันการแก้ไข"
      confirmLabel="บันทึก"
      className="flex flex-col gap-4"
      autoComplete="off"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="name" label="ชื่อ-นามสกุล" autoComplete="off" defaultValue={user?.name} error={errors.name} required />
        <TextField name="nickname" label="ชื่อเล่น" autoComplete="off" defaultValue={user?.nickname} error={errors.nickname} required />
        <TextField name="login" label="อีเมล เบอร์มือถือ หรือรหัสผู้ใช้" autoComplete="off" defaultValue={user?.login} error={errors.login} required />
        <Dropdown
          name="role"
          label="บทบาท"
          value={role}
          onChange={v => { setRole(v); }}
          options={roleOptions}
          hint={roleHint}
          error={errors.role}
        />
        <TextField name="password" label={editing ? 'รหัสผ่านใหม่' : 'รหัสผ่านเริ่มต้น'} optional={editing} type="password" autoComplete="new-password" maxLength={200} hint={editing ? 'เว้นว่าง = ใช้รหัสผ่านเดิม' : 'เข้าสู่ระบบครั้งแรกจะต้องตั้งรหัสผ่านใหม่'} error={errors.password} required={!editing} />
        <TextField name="confirmPassword" label="ยืนยันรหัสผ่าน" optional={editing} type="password" autoComplete="new-password" maxLength={200} error={errors.confirmPassword} required={!editing} />
        <DatePickerField name="activeFrom" label="ใช้งานได้ตั้งแต่ (active from)" optional defaultValue={user?.activeFrom ?? ''} today={today} placeholder="ไม่จำกัด" error={errors.activeFrom} />
        <DatePickerField name="activeTo" label="ใช้งานได้ถึง (active to)" optional defaultValue={user?.activeTo ?? ''} today={today} placeholder="ไม่จำกัด" error={errors.activeTo} />
        {canManageRoles ? (
          <TextField name="branch" label="สาขา" defaultValue={user?.branch ?? branch} autoComplete="off" error={errors.branch} required />
        ) : (
          // เจ้าของเพิ่มบัญชีได้เฉพาะสาขาของตัวเอง (server บังคับซ้ำ)
          <TextField name="branch" label="สาขา" value={branch} readOnly hint="เพิ่มได้เฉพาะสาขาที่คุณดูแล · เปลี่ยนสาขาจากแท็บด้านบน" />
        )}
        {role === 'trainer' && (
          <Dropdown
            name="trainerId"
            label="โปรไฟล์เทรนเนอร์"
            defaultValue={user?.trainerId ?? ''}
            error={errors.trainerId}
            options={[
              { value: '', label: 'เลือกเทรนเนอร์' },
              ...options.trainers.map(trainer => ({
                value: trainer.id,
                label: trainer.nickname,
              })),
            ]}
          />
        )}
        {role === 'member' && (
          <Dropdown
            name="memberId"
            label="บัญชีสมาชิก"
            defaultValue={user?.memberId ?? ''}
            error={errors.memberId}
            options={[
              { value: '', label: 'เลือกสมาชิกที่ยังไม่มีบัญชี' },
              ...options.members.map(member => ({
                value: member.id,
                label: member.name,
                description: `รหัส ${member.code}`,
              })),
            ]}
          />
        )}
      </div>
      {editing && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={user?.active} className="size-5 accent-lime" />
          เปิดใช้งานบัญชี <span className="text-muted">(ไม่ติ๊ก = เข้าสู่ระบบไม่ได้ และออกจากระบบทุกเครื่องทันที)</span>
        </label>
      )}
      <p className="text-xs text-muted">กำหนดรหัสผ่านได้ 1–200 ตัวอักษร และกรอกช่องยืนยันให้ตรงกัน · ช่วงวันที่ใช้งานเว้นว่าง = ไม่จำกัด นอกช่วงนี้เข้าสู่ระบบไม่ได้</p>
      <div className="flex flex-col items-end gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มบัญชีผู้ใช้'}</button>
        <div className="text-right"><ResultMessage state={state} successTitle={editing ? 'แก้ไขสำเร็จ' : undefined} /></div>
      </div>
    </ConfirmForm>
  );
}

/** (admin) เพิ่มสาขาให้เจ้าของดูแล */
export function OwnerBranchForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end" autoComplete="off">
      <div className="min-w-0 flex-1">
        <TextField name="branch" label="ชื่อสาขา" placeholder="เช่น สาขาบางนา" hint="พิมพ์ชื่อให้ตรงกับสาขาของพนักงาน" error={errors.branch} required />
      </div>
      <div className="flex flex-col gap-1.5 sm:pb-6">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มสาขา'}</button>
      </div>
      <ResultMessage state={state} />
    </form>
  );
}
