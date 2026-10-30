'use client';

import { useState } from 'react';
import { ACTIVITIES, ACTIVITY_INFO, GOAL_INFO, GOALS, SEX_LABEL, SEXES, type BodyProfile } from '@/api/services/nutrition/nutrition/nutrition.service';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ChoiceCard, FieldError, TextField } from '@/web/components/ui/ui/ui.field';
import { btn } from '@/web/components/ui/ui/ui';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const fieldError = (state: ActionResult, name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

/**
 * ข้อมูลร่างกาย + ความยินยอมเก็บข้อมูลสุขภาพ (แยกจาก consent อื่น ไม่ติ๊กไว้ล่วงหน้า — PDPA ม.26)
 * `initial` = แก้ไขข้อมูลเดิม (ยินยอมแล้ว แต่ยังต้องติ๊กยืนยันทุกครั้งที่ส่งข้อมูลใหม่)
 */
export function HealthProfileForm({ action, initial }: { action: Action; initial?: BodyProfile }) {
  const { state, submit, pending } = useFormAction(action);
  const [sex, setSex] = useState<string>(initial?.sex ?? '');
  const [goal, setGoal] = useState<string>(initial?.goal ?? '');
  const [activity, setActivity] = useState<string>(initial?.activity ?? '');
  const err = (name: string) => fieldError(state, name);

  return (
    <ConfirmForm onSubmitData={submit} confirm={initial ? 'บันทึกการแก้ไขข้อมูลร่างกาย? เป้าหมายแคลอรี่และโปรตีนจะคำนวณใหม่' : undefined} confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" aria-describedby={err('goal') ? 'goal-error' : undefined}>
        <legend className="mb-2 text-sm font-semibold">เป้าหมาย</legend>
        {GOALS.map(g => <ChoiceCard key={g} name="goal" value={g} checked={goal === g} onChange={setGoal} title={GOAL_INFO[g].label} detail={GOAL_INFO[g].detail} />)}
        <FieldError id="goal-error" error={err('goal')} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2 sm:col-span-2" aria-describedby={err('sex') ? 'sex-error' : undefined}>
          <legend className="mb-2 text-sm font-semibold">เพศ <span className="font-normal text-faint">(ใช้คำนวณการเผาผลาญ)</span></legend>
          <div className="grid grid-cols-2 gap-2">
            {SEXES.map(s => <ChoiceCard key={s} name="sex" value={s} checked={sex === s} onChange={setSex} title={SEX_LABEL[s]} />)}
          </div>
          <FieldError id="sex-error" error={err('sex')} />
        </fieldset>
        <TextField name="birthYear" label="ปีเกิด (ค.ศ.)" inputMode="numeric" placeholder="เช่น 1995" defaultValue={initial?.birthYear} error={err('birthYear')} />
        <TextField name="heightCm" label="ส่วนสูง (ซม.)" inputMode="numeric" placeholder="เช่น 170" defaultValue={initial?.heightCm} error={err('heightCm')} />
        <TextField name="weightKg" label="น้ำหนัก (กก.)" inputMode="decimal" placeholder="เช่น 65" defaultValue={initial?.weightKg} error={err('weightKg')} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={err('activity') ? 'activity-error' : undefined}>
        <legend className="mb-2 text-sm font-semibold">ออกกำลังบ่อยแค่ไหน</legend>
        {ACTIVITIES.map(a => <ChoiceCard key={a} name="activity" value={a} checked={activity === a} onChange={setActivity} title={ACTIVITY_INFO[a].label} />)}
        <FieldError id="activity-error" error={err('activity')} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg p-4 has-[:checked]:border-lime">
          <input type="checkbox" name="healthConsent" aria-invalid={err('healthConsent') ? true : undefined} aria-describedby={err('healthConsent') ? 'consent-error' : undefined} className="mt-0.5 size-5 shrink-0 accent-lime" />
          <span className="text-sm">
            <b className="block font-semibold">ยินยอมให้เก็บข้อมูลสุขภาพ</b>
            <span className="text-muted">เพศ ปีเกิด ส่วนสูง น้ำหนัก และบันทึกอาหาร ใช้คำนวณเป้าอาหารให้คุณเท่านั้น คนอื่นรวมถึงพนักงานยิมไม่เห็นข้อมูลนี้ ถอนความยินยอมได้ทุกเมื่อ และระบบจะลบข้อมูลทั้งหมดทันที</span>
          </span>
        </label>
        <FieldError id="consent-error" error={err('healthConsent')} />
      </div>

      <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังคำนวณ…' : initial ? 'บันทึกและคำนวณใหม่' : 'คำนวณเป้าอาหารของฉัน'}</button>
      <ResultMessage state={state} successTitle={initial ? 'แก้ไขสำเร็จ' : undefined} />
    </ConfirmForm>
  );
}

/** บันทึกเมนูที่ไม่มีในรายการแนะนำ */
export function CustomMealForm({ action }: { action: Action }) {
  const { state, onSubmit, pending } = useFormAction(action);
  // บันทึกสำเร็จแล้วล้างช่อง (สร้างฟอร์มใหม่ด้วย key) · error = เก็บค่าที่กรอกไว้ให้แก้ต่อ
  const [seen, setSeen] = useState(state);
  const [formKey, setFormKey] = useState(0);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setFormKey(k => k + 1);
  }
  const err = (name: string) => fieldError(state, name);
  return (
    <form key={formKey} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <TextField name="name" label="ชื่อเมนู" placeholder="เช่น ผัดไทยกุ้งสด" error={err('name')} />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="kcal" label="พลังงาน (kcal)" inputMode="numeric" placeholder="เช่น 450" error={err('kcal')} />
        <TextField name="proteinG" label="โปรตีน (กรัม)" inputMode="numeric" placeholder="ถ้าทราบ" optional />
      </div>
      <button type="submit" disabled={pending} className={btn.secondary}>{pending ? 'กำลังบันทึก…' : 'บันทึกมื้อนี้'}</button>
      <ResultMessage state={state} />
    </form>
  );
}
