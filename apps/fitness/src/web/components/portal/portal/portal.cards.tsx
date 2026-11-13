'use client';

import { formatBaht, formatThaiDate } from '@/api/lib/utils/utils/utils';
import { CircleAlert, CreditCard, RefreshCw, ScanLine } from 'lucide-react';
import { useActionState, useState } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { TEST_CARDS } from '@/api/services/subscriptions/subscriptions/subscriptions.service';
import type { MyAutoRenewDto } from '@/api/types/subscriptions/subscriptions/subscriptions.types';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { useNotifyingAction } from '@/web/components/ui/ui/ui.toast';
import { Dropdown } from '@/web/components/ui/ui/ui.dropdown';
import { btn } from '@/web/components/ui/ui/ui';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';

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

/**
 * ปุ่มเช็กอินของสมาชิก — ใหญ่ เห็นชัดบนมือถือ · แจ้งผลการเช็กอินด้วย popup กลางจอ
 * `checkedInAt` = เวลาเข้าของรอบที่ยังไม่เช็กเอาต์วันนี้ (ถ้ามี)
 */
export function SelfCheckInButton({ action, checkedInAt }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>; checkedInAt: string | null }) {
  const { state, run, pending } = useNotifyingAction(action);
  const [dismissedState, setDismissedState] = useState<ActionResult>(null);
  const showError = Boolean(state && !state.ok && dismissedState !== state);
  return (
    <>
      <form
        onSubmit={event => {
          event.preventDefault();
          run(new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-2"
      >
        <button type="submit" disabled={pending} className={`${btn.primary} min-h-14 w-full font-display text-lg`}>
          <ScanLine aria-hidden className="size-6" />
          {pending ? 'กำลังบันทึก…' : checkedInAt ? 'เช็กเอาต์' : 'เช็กอินเข้ายิม'}
        </button>
        <p className="text-center text-sm text-muted">
          {checkedInAt ? `กำลังอยู่ในยิม · เช็กอินเวลา ${checkedInAt} น. · กดเมื่อออกจากยิม` : 'กดเมื่อมาถึงยิม · กดอีกครั้งเมื่อออก · หรือให้เคาน์เตอร์สแกน QR ด้านล่าง'}
        </p>
      </form>
      <FormDialog
        open={showError}
        onClose={() => {
          setDismissedState(state);
        }}
        title="แจ้งเตือนการเช็กอิน"
        subtitle="กรุณาตรวจสอบสถานะสมาชิกก่อนเข้าใช้บริการ"
      >
        {state && !state.ok && (
          <div className="space-y-5">
            <section role="alert" className="rounded-2xl border border-danger/25 bg-gradient-to-br from-danger/10 via-danger/5 to-transparent p-5 text-center sm:p-6">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger/15 text-danger ring-1 ring-danger/20">
                <CircleAlert aria-hidden className="size-7" />
              </span>
              <p className="mt-4 text-xs font-bold tracking-[0.12em] text-danger">ไม่สามารถเข้าใช้บริการได้</p>
              <p className="mt-2 text-base font-semibold leading-relaxed text-ink sm:text-lg">{state.message}</p>
            </section>
            <div className="rounded-xl border border-line bg-bg px-4 py-3">
              <p className="text-sm text-muted">หากต้องการความช่วยเหลือ กรุณาติดต่อเจ้าหน้าที่ที่เคาน์เตอร์</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedState(state);
              }}
              className={`${btn.primary} w-full`}
            >
              รับทราบ
            </button>
          </div>
        )}
      </FormDialog>
    </>
  );
}
