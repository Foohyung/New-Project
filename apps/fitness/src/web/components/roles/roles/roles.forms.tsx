'use client';

import { useActionState, useState } from 'react';
import { Search } from 'lucide-react';
import { PERMISSION_LABEL, PERMISSIONS, permissionsAllowedForRole, type Permission } from '@/api/services/auth/auth/auth.roles';
import type { RoleDefinitionDto } from '@/api/types/users/users/users.types';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage, ResultText } from '@/web/components/ui/ui/ui.action-button';
import { useNotifyingAction } from '@/web/components/ui/ui/ui.toast';
import { btn, inputClass } from '@/web/components/ui/ui/ui';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';

const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  { title: 'ภาพรวมและรายงาน', permissions: ['dashboard.view', 'revenue.view', 'reports.view'] },
  { title: 'สมาชิกและหน้าร้าน', permissions: ['members.view', 'members.manage', 'checkin.use', 'retention.view'] },
  { title: 'คลาสและเทรนเนอร์', permissions: ['classes.view', 'classes.book', 'classes.manage', 'trainers.view', 'pt.manage'] },
  { title: 'การเงินและการตลาด', permissions: ['payments.view', 'payments.collect', 'payments.confirm', 'packages.manage', 'marketing.manage'] },
  { title: 'สมาชิกและการฝึก', permissions: ['portal.use', 'coach.use'] },
  { title: 'ระบบและแบรนด์', permissions: ['users.manage', 'roles.manage', 'branding.view', 'branding.manage'] },
];

function PermissionCheckboxes({ selected, onChange, roleId }: { selected: Permission[]; onChange: (permission: Permission, checked: boolean) => void; roleId: string }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filters = [
    { id: 'all', label: 'ทุกสิทธิ์' },
    { id: 'selected', label: `เลือกแล้ว (${selected.length})` },
    ...PERMISSION_GROUPS.map(group => ({ id: group.title, label: group.title })),
  ];
  const visibleGroups = PERMISSION_GROUPS
    .filter(group => filter === 'all' || filter === 'selected' || filter === group.title)
    .map(group => ({
      ...group,
      permissions: group.permissions.filter(permission => {
        if (!permissionsAllowedForRole(roleId, [permission])) return false;
        if (filter === 'selected' && !selected.includes(permission)) return false;
        if (!normalizedSearch) return true;
        return permission.toLocaleLowerCase().includes(normalizedSearch) ||
          PERMISSION_LABEL[permission].toLocaleLowerCase().includes(normalizedSearch);
      }),
    }))
    .filter(group => group.permissions.length > 0);
  const visiblePermissions = new Set(visibleGroups.flatMap(group => group.permissions));
  const hiddenSelectedPermissions = selected.filter(permission => !visiblePermissions.has(permission));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-bg/50 p-3 sm:p-4">
      {hiddenSelectedPermissions.map(permission => <input key={permission} type="hidden" name="permissions" value={permission} />)}
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          aria-label="ค้นหาสิทธิ์"
          value={search}
          onChange={event => { setSearch(event.target.value); }}
          placeholder="ค้นหาจากชื่อหรือรหัสสิทธิ์…"
          className={`${inputClass} min-h-11 pl-10`}
        />
      </div>
      <nav aria-label="กรองสิทธิ์ตามหมวด" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none sm:-mx-4 sm:px-4">
        {filters.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => { setFilter(item.id); }}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-muted transition-colors hover:border-lime/60 hover:text-ink aria-pressed:border-lime aria-pressed:bg-lime aria-pressed:text-bg"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="grid gap-3 lg:grid-cols-2">
      {visibleGroups.map(group => (
        <fieldset key={group.title} className="min-w-0 rounded-2xl border border-line bg-surface p-3 sm:p-4">
          <legend className="px-1 text-sm font-semibold">{group.title}</legend>
          <div className="flex flex-col gap-1.5">
            {group.permissions.map(permission => (
              <label key={permission} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 text-sm text-muted transition-colors hover:border-line hover:bg-surface-2 has-[:checked]:border-lime/40 has-[:checked]:bg-lime/5 has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
                <input type="checkbox" name="permissions" value={permission} checked={selected.includes(permission)} onChange={event => { onChange(permission, event.target.checked); }} className="size-4 shrink-0 accent-lime" />
                <span className="min-w-0 flex-1">{PERMISSION_LABEL[permission]}</span>
                <code className="hidden text-[11px] text-faint sm:block">{permission}</code>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      </div>
      {visibleGroups.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted lg:col-span-2">
          {filter === 'selected' && selected.length === 0 ? 'ยังไม่ได้เลือกสิทธิ์' : 'ไม่พบสิทธิ์ที่ตรงกับตัวกรอง'}
        </p>
      )}
    </div>
  );
}

export function RoleEditorForm({
  role,
  createAction,
  updateAction,
}: {
  role?: RoleDefinitionDto;
  createAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  updateAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const action = role ? updateAction : createAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [selected, setSelected] = useState<Permission[]>(role?.permissions ?? []);
  const change = (permission: Permission, checked: boolean) => {
    setSelected(current => checked ? [...new Set([...current, permission])] : current.filter(value => value !== permission));
  };
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const roleId = role?.id ?? 'custom';

  return (
    <ConfirmForm action={formAction} confirm={role ? `บันทึกการแก้ไข role "${role.name}"? บัญชีที่ใช้ role นี้จะได้สิทธิ์ใหม่ทันที` : undefined} confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" className="flex flex-col gap-4">
      {role && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {!role && <TextField name="id" label="รหัส role (ภาษาอังกฤษ)" placeholder="เช่น supervisor" hint="ใช้ตัวอักษร a-z ตัวเลข และขีดกลาง" error={errors.id} required />}
        <TextField name="name" label="ชื่อ role" defaultValue={role?.name} error={errors.name} required />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">เมนูและสิทธิ์การทำงาน</h3>
        <p className="mb-3 text-xs text-muted">
          ทุกบทบาทเลือกสิทธิ์ได้เหมือนกัน · สิทธิ์จัดการ role สงวนไว้สำหรับ admin · ตรวจสิทธิ์ข้อมูลสมาชิกและเทรนเนอร์ตามบัญชีที่ผูกไว้
        </p>
        <PermissionCheckboxes selected={selected} onChange={change} roleId={roleId} />
        {errors.permissions && <p className="mt-2 text-sm text-danger">{errors.permissions}</p>}
      </div>
      {/* ปุ่มหลักชิดขวา ข้อความผลลัพธ์อยู่ทางซ้ายของปุ่ม */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle={role ? 'แก้ไขสำเร็จ' : undefined} />
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : role ? 'บันทึก role' : 'สร้าง role'}</button>
      </div>
    </ConfirmForm>
  );
}

export function DeleteRoleForm({ roleId, action }: { roleId: string; action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  // แจ้งผลทันที — ลบแล้วหน้าเปลี่ยนไปแสดง role อื่น ฟอร์มนี้อาจหายไป
  const { state, run, pending } = useNotifyingAction(action, { successTitle: 'ลบสำเร็จ' });
  return (
    <ConfirmForm onSubmitData={run} confirm={`ลบ role "${roleId}"? role ที่มีบัญชีผู้ใช้ผูกอยู่จะลบไม่ได้`} confirmTitle="ยืนยันการลบ" confirmLabel="ลบ role" confirmTone="danger" className="flex flex-col gap-2">
      <input type="hidden" name="id" value={roleId} />
      <button type="submit" disabled={pending} className={btn.danger}>{pending ? 'กำลังลบ…' : 'ลบ role'}</button>
      <ResultText state={state} />
    </ConfirmForm>
  );
}

export function RolePermissionLegend() {
  return <p className="text-xs text-muted">{String(PERMISSIONS.length)} สิทธิ์ระบบ · เมนูจะปรากฏตาม permission ของ role</p>;
}
