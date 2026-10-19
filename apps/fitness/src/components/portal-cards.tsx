'use client';

import { formatBaht, formatThaiDate } from '@repo/utils';
import { Check, Copy, CreditCard, RefreshCw } from 'lucide-react';
import { useActionState, useState } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { TEST_CARDS } from '@/features/subscriptions/service';
import type { MyAutoRenewDto } from '@/features/subscriptions/types';
import { ResultMessage } from './action-button';
import { Dropdown } from './dropdown';
import { btn } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** เปิด/ปิดต่ออายุอัตโนมัติ (โหมดทดลองใช้บัตรทดสอบ ไม่มีการกรอกเลขบัตรจริง) */
export function AutoRenewCard({ data, action }: { data: MyAutoRenewDto; action: Action }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [last4, setLast4] = useState(data.card?.last4 ?? TEST_CARDS[0]?.last4 ?? '');
  if (!data.eligible) return <p className="text-sm text-muted">ต่ออายุอัตโนมัติใช้ได้กับแพ็กเกจรายเดือน/รายปี</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${data.enabled ? 'border-lime/50 bg-lime/5' : 'border-line bg-bg'}`}>
        <div className="min-w-0">
          <b className="flex items-center gap-2"><RefreshCw aria-hidden className="size-4 text-lime" />ต่ออายุอัตโนมัติ{data.enabled ? ' · เปิดอยู่' : ''}</b>
          <p className="text-sm text-muted">
            {data.enabled && data.nextChargeOn ? `ตัดบัตรครั้งถัดไป ${formatThaiDate(data.nextChargeOn)} · ${formatBaht(data.amountSatang)}` : `${data.packageName} ${formatBaht(data.amountSatang)} ตัดบัตรก่อนหมดอายุ 3 วัน ไม่ต้องจำวันจ่าย`}
          </p>
        </div>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="enabled" value="on" />
        <input type="hidden" name="last4" value={last4} />
        <Dropdown
          label="บัตรที่ใช้ตัด"
          value={last4}
          onChange={setLast4}
          options={TEST_CARDS.map(c => ({ value: c.last4, label: c.label, description: `หมดอายุ ${c.exp} · บัตรทดสอบ`, icon: <CreditCard className="size-4" /> }))}
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>{data.enabled ? 'บันทึกบัตรใหม่' : 'เปิดต่ออายุอัตโนมัติ'}</button>
          {data.enabled && <button type="submit" name="enabled" value="off" formNoValidate disabled={pending} className={btn.ghost}>ปิด</button>}
        </div>
      </form>
      <ResultMessage state={state} />
      <p className="text-xs text-faint">แจ้งเตือนก่อนตัดบัตร 3 วันทุกครั้ง · ยกเลิกได้ทุกเมื่อ · โหมดทดลองใช้บัตรทดสอบเท่านั้น</p>
    </div>
  );
}

export function CopyButton({ text, label = 'คัดลอก' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => { setDone(false); }, 1600);
        });
      }}
      className={`${btn.secondary} shrink-0`}
    >
      {done ? <Check aria-hidden className="size-4 text-lime" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{done ? 'คัดลอกแล้ว' : label}</span>
    </button>
  );
}
