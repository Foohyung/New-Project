'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { exercisesFor, MUSCLE_LABEL, MUSCLE_REGIONS, type Muscle } from '@/features/workouts/catalog';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { BodyMap } from './body-map';
import { btn } from './ui';
import { useFormAction } from './use-form-action';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** เลือกกล้ามเนื้อทีละมัดจากภาพร่างกายหรือปุ่มชื่อ แล้วเลือกท่าที่จะเพิ่มลงโปรแกรมวันนี้ */
export function WorkoutPicker({ addAction, planned }: { addAction: Action; planned: readonly string[] }) {
  const [muscles, setMuscles] = useState<Muscle[]>(['upper-chest']);
  const [skipped, setSkipped] = useState<string[]>([]);
  const { state, onSubmit, pending } = useFormAction(addAction);
  const toggle = (m: Muscle) => {
    setMuscles(list => (list.includes(m) ? list.filter(x => x !== m) : [...list, m]));
  };
  const list = exercisesFor(muscles);
  const chosen = list.filter(e => !skipped.includes(e.id) && !planned.includes(e.id));

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="pick-title" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 id="pick-title" className="font-display text-lg font-semibold">อยากได้ส่วนไหน</h2>
        <p className="text-sm text-muted">แตะกล้ามเนื้อทีละมัดบนภาพ หรือกดชื่อด้านล่าง เลือกได้หลายมัด</p>
        <div className="mx-auto mt-3 max-w-[300px] sm:max-w-sm">
          <BodyMap selected={muscles} onToggle={toggle} />
        </div>
        <div role="group" aria-label="กล้ามเนื้อ" className="mt-3 flex flex-col gap-3">
          {MUSCLE_REGIONS.map(r => (
            <div key={r.label} role="group" aria-label={r.label} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-faint">{r.label}</span>
              <div className="flex flex-wrap gap-2">
                {r.muscles.map(m => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={muscles.includes(m)}
                    onClick={() => {
                      toggle(m);
                    }}
                    className="min-h-10 rounded-full border border-line bg-surface-2 px-4 text-sm font-semibold aria-pressed:border-lime aria-pressed:bg-lime aria-pressed:text-bg"
                  >
                    {MUSCLE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={onSubmit} aria-labelledby="ex-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ex-title" className="font-display text-lg font-semibold">{muscles.length ? `ท่าฝึก · ${muscles.map(m => MUSCLE_LABEL[m]).join(' + ')}` : 'ท่าฝึก'}</h2>
          <span className="text-xs text-muted">ใช้อุปกรณ์ในยิม</span>
        </div>
        {list.length === 0 ? <p className="text-sm text-muted">ยังไม่ได้เลือกกล้ามเนื้อ</p> : (
          <ul className="flex flex-col divide-y divide-line">
            {list.map(e => {
              const inPlan = planned.includes(e.id);
              return (
                <li key={e.id}>
                  <label className={`flex min-h-14 items-center gap-3 py-2.5 ${inPlan ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      name="exerciseId"
                      value={e.id}
                      disabled={inPlan}
                      checked={inPlan || !skipped.includes(e.id)}
                      onChange={ev => {
                        const { checked } = ev.target;
                        setSkipped(s => (checked ? s.filter(x => x !== e.id) : [...s, e.id]));
                      }}
                      className="size-5 shrink-0 accent-lime"
                    />
                    <span className="min-w-0 flex-1">
                      <b className="block font-semibold">{e.name}</b>
                      <small className="block text-xs text-muted">{inPlan ? 'อยู่ในโปรแกรมวันนี้แล้ว' : `${e.muscles.map(m => MUSCLE_LABEL[m]).join(' · ')} · ${e.equipment}`}</small>
                      {!inPlan && <small className="block text-xs text-faint">{e.cue}</small>}
                    </span>
                    <span className="shrink-0 font-display text-sm font-semibold text-muted">{e.sets}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <button type="submit" disabled={pending || chosen.length === 0} className={btn.primary}>
          <Plus aria-hidden className="size-5" />
          {pending ? 'กำลังเพิ่ม…' : `เพิ่มลงโปรแกรมวันนี้ · ${String(chosen.length)} ท่า`}
        </button>
        <ResultMessage state={state} />
      </form>
    </div>
  );
}

/** หนึ่งท่าในโปรแกรมวันนี้: ติ๊กว่าทำแล้ว หรือลบออก */
export function PlanItem({ name, detail, sets, done, toggleAction, removeAction }: { name: string; detail: string; sets: string; done: boolean; toggleAction: Action; removeAction: Action }) {
  const [toggleState, toggleForm, toggling] = useActionState<ActionResult, FormData>(toggleAction, null);
  const [removeState, removeForm, removing] = useActionState<ActionResult, FormData>(removeAction, null);
  const failed = [toggleState, removeState].find(s => s && !s.ok) ?? null;
  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-center gap-3">
        <form action={toggleForm}>
          <button
            type="submit"
            disabled={toggling}
            aria-pressed={done}
            aria-label={`${name} ${done ? 'ทำเสร็จแล้ว (กดเพื่อยกเลิก)' : 'ยังไม่ได้ทำ (กดเมื่อทำเสร็จ)'}`}
            className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-line aria-pressed:border-lime aria-pressed:bg-lime aria-pressed:text-bg"
          >
            {done && <Check aria-hidden className="size-5" />}
          </button>
        </form>
        <span className="min-w-0 flex-1">
          <b className={`block font-semibold ${done ? 'text-muted line-through' : ''}`}>{name}</b>
          <small className="block text-xs text-muted">{detail}</small>
        </span>
        <span className="shrink-0 font-display text-sm font-semibold text-muted">{sets}</span>
        <form action={removeForm}>
          <button type="submit" disabled={removing} aria-label={`ลบ ${name} ออกจากโปรแกรม`} className={`${btn.ghost} size-11 px-0`}>
            <Trash2 aria-hidden className="size-4" />
          </button>
        </form>
      </div>
      {failed && <ResultMessage state={failed} />}
    </li>
  );
}
