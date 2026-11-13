'use client';

import { useState } from 'react';
import { formatReceiptNo, receiptFormatError } from '@/api/services/payments/payments/payments.service';
import type { ReceiptIssuer } from '@/api/types/payments/payments/payments.types';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { btn } from '@/web/components/ui/ui/ui';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const FIELDS: { name: keyof ReceiptIssuer; label: string; multiline?: boolean; inputMode?: 'numeric' | 'tel'; wide?: boolean }[] = [
  { name: 'brand', label: 'ชื่อบนหัวใบเสร็จ' },
  { name: 'legalName', label: 'ชื่อผู้ประกอบการ (นิติบุคคล/บุคคล)' },
  { name: 'address', label: 'ที่อยู่', multiline: true, wide: true },
  { name: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี', inputMode: 'numeric' },
  { name: 'phone', label: 'เบอร์โทร', inputMode: 'tel' },
];

const INPUT = 'w-full rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-lime focus:ring-2 focus:ring-lime/20 aria-[invalid=true]:border-danger';

/** หัวใบเสร็จ/ใบกำกับภาษีอย่างย่อของสาขา — ช่องว่างใช้ค่าเริ่มต้นที่แสดงเป็นตัวอย่างในช่อง */
export function ReceiptSettingsForm({ branch, saved, defaults, numberFormat, defaultNumberFormat, lastNumber, nextNumber, today, action }: { branch: string; saved: Partial<ReceiptIssuer>; defaults: ReceiptIssuer; numberFormat: string | null; defaultNumberFormat: string; lastNumber: string | null; nextNumber: string; today: string; action: Action }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  // เริ่มด้วยรูปแบบที่สาขาใช้อยู่จริง (ยังไม่ตั้ง = รูปแบบเริ่มต้น)
  const current = numberFormat ?? defaultNumberFormat;
  const [format, setFormat] = useState(current);
  const unchanged = (format.trim() || defaultNumberFormat) === current;
  const effective = format.trim() || defaultNumberFormat;
  const formatProblem = receiptFormatError(effective);
  const formatError = fieldErrors?.numberFormat ?? (format.trim() ? formatProblem : null);

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="branch" value={branch} />
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(f => {
          const error = fieldErrors?.[f.name];
          const common = { id: `receipt-${f.name}`, name: f.name, defaultValue: saved[f.name] ?? '', placeholder: defaults[f.name], 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `receipt-${f.name}-error` : undefined };
          return (
            <label key={f.name} htmlFor={common.id} className={`grid gap-1 text-sm font-medium ${f.wide ? 'sm:col-span-2' : ''}`}>
              {f.label}
              {f.multiline
                ? <textarea {...common} rows={2} className={`${INPUT} min-h-20 py-2.5`} />
                : <input {...common} inputMode={f.inputMode} autoComplete="off" className={`${INPUT} min-h-12`} />}
              {error && <span id={`${common.id}-error`} className="text-xs font-normal text-danger">{error}</span>}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted">เว้นว่าง = ใช้ค่าที่แสดงจาง ๆ ในช่อง (ชื่อยิม / ที่อยู่และเบอร์ของสาขา) · ชื่อสาขาบนใบเสร็จแก้ได้ที่หน้าสาขา</p>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">เลขที่ใบเสร็จ</legend>
        <label htmlFor="receipt-numberFormat" className="grid gap-1 text-sm font-medium">
          รูปแบบเลขที่ใบเสร็จ
          <input
            id="receipt-numberFormat"
            name="numberFormat"
            value={format}
            onChange={e => { setFormat(e.currentTarget.value); }}
            placeholder={defaultNumberFormat}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={formatError ? true : undefined}
            aria-describedby="receipt-numberFormat-help"
            className={`${INPUT} min-h-12 font-mono`}
          />
        </label>
        {formatError
          ? <p className="text-sm text-danger">{formatError}</p>
          : unchanged
            ? (
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-bg px-3 py-2"><dt className="text-xs text-muted">ใบล่าสุดของสาขานี้ (งวดนี้)</dt><dd className="font-mono font-semibold">{lastNumber ?? 'ยังไม่มี'}</dd></div>
                  <div className="rounded-xl border border-lime/50 bg-lime/5 px-3 py-2"><dt className="text-xs text-muted">ใบถัดไปจะเป็น</dt><dd className="font-mono font-semibold text-lime">{nextNumber}</dd></div>
                </dl>
              )
            : <p className="text-sm">ถ้าบันทึก ใบแรกของรูปแบบใหม่จะเป็น <b className="font-mono">{formatReceiptNo(effective, 1, today)}</b> <span className="text-muted">(นับต่อจากใบล่าสุดถ้ารูปแบบนี้เคยใช้มาแล้ว)</span></p>}
        <div id="receipt-numberFormat-help" className="grid gap-1 text-xs text-muted">
          <p>ตัวแปร: <code>{'{YYYY}'}</code> ปี พ.ศ. · <code>{'{YY}'}</code> ปี พ.ศ. 2 หลัก · <code>{'{MM}'}</code> เดือน · <code>{'{DD}'}</code> วัน · <code>{'{####}'}</code> เลขรัน (จำนวน # = จำนวนหลัก)</p>
          <p>เลขรันของสาขานี้นับต่อจากใบล่าสุดในรูปแบบเดียวกัน และเริ่ม 1 ใหม่เองเมื่อปี/เดือนในรูปแบบเปลี่ยน · ใส่ตัวย่อสาขาให้ไม่ซ้ำกับสาขาอื่น เช่น <code>BKK-{'{YY}{MM}'}-{'{####}'}</code></p>
        </div>
      </fieldset>
      {state && <ResultMessage state={state} />}
      <button type="submit" disabled={pending || Boolean(format.trim() && formatProblem)} className={`${btn.primary} min-h-12`}>
        {pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูลบนใบเสร็จ'}
      </button>
    </form>
  );
}
