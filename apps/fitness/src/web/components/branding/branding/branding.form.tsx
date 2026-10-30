'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { BranchBrandingDto } from '@/api/types/branding/branding/branding.types';
import { DEFAULT_BRAND_COLOR } from '@/api/services/branding/branding/branding.service';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { btn } from '@/web/components/ui/ui/ui';
import { FileDrop } from '@/web/components/ui/ui/ui.file-drop';
import { TextField } from '@/web/components/ui/ui/ui.field';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';

export function BrandingForm({
  branding,
  action,
}: {
  branding: BranchBrandingDto;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const logoSrc = branding.hasUploadedLogo ? '/api/branding/logo' : branding.logoUrl;

  return (
    <ConfirmForm action={formAction} confirm="บันทึกการเปลี่ยนชื่อ Gym สี และโลโก้ของสาขา?" confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" encType="multipart/form-data" className="flex flex-col gap-5">
      <TextField
        name="gymName"
        label="ชื่อ Gym"
        defaultValue={branding.gymName ?? ''}
        placeholder="เช่น FitFlow Fitness Studio"
        hint="จะแสดงเป็นชื่อหลักของสาขา ส่วน FitFlow จะแสดงเป็นชื่อระบบรอง"
        error={errors.gymName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="primary-color" className="text-sm font-semibold">สีหลักของเว็บ</label>
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-bg px-3">
            <input id="primary-color" name="primaryColor" type="color" defaultValue={branding.primaryColor ?? DEFAULT_BRAND_COLOR} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            <span className="text-sm text-muted">สีปุ่ม ไฮไลต์ และโลโก้ FitFlow</span>
          </div>
          {errors.primaryColor && <p className="text-sm text-danger">{errors.primaryColor}</p>}
        </div>
        <TextField
          name="logoUrl"
          label="URL โลโก้ (HTTPS)"
          type="url"
          defaultValue={branding.logoUrl ?? ''}
          placeholder="https://example.com/logo.png"
          hint="ใช้ URL ภายนอกแบบ HTTPS หรือพาธรูปภายในเว็บได้ หรือเลือกอัปโหลดไฟล์ด้านล่าง"
          error={errors.logoUrl}
        />
      </div>
      <FileDrop
        id="logo-file"
        name="logoFile"
        label="อัปโหลดโลโก้"
        accept="image/png,image/jpeg,image/webp"
        maxBytes={5 * 1024 * 1024}
        hint="รองรับ PNG, JPEG และ WebP ขนาดไม่เกิน 5 MB"
        error={errors.logoFile}
      />
      {logoSrc && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
          <Image src={logoSrc} alt={`โลโก้ ${branding.branch}`} width={64} height={64} unoptimized className="size-16 rounded-lg object-contain" />
          <span className="text-sm text-muted">โลโก้ที่ใช้อยู่</span>
        </div>
      )}
      {logoSrc && <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
        <input type="checkbox" name="clearLogo" className="size-5 accent-lime" />
        ลบโลโก้ปัจจุบัน
      </label>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกแบรนด์สาขา'}</button>
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
      </div>
    </ConfirmForm>
  );
}
