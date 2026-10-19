'use client';

import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useActionState, useState } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { btn, inputClass } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const isEmail = (v: string) => v.includes('@');
const isPhone = (v: string) => !isEmail(v) && v.replace(/\D/g, '').length >= 9;

/**
 * ฟอร์มเข้าสู่ระบบ — ไม่มีให้เลือกบทบาท ระบบรู้บทบาทจากบัญชีเอง
 * ช่องเป็นแบบ uncontrolled (ไม่โดนล้างตอน hydrate) · ใส่ผิดแล้ว React ล้างฟอร์ม → ช่องอีเมลกลับเป็นค่าที่เพิ่งพิมพ์ (defaultValue) ส่วนรหัสผ่านว่าง
 */
export function LoginForm({ action, next }: { action: Action; next?: string }) {
  const [last, setLast] = useState('');
  const [typed, setTyped] = useState('');
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const raw = formData.get('identifier');
    const id = typeof raw === 'string' ? raw : '';
    setLast(id);
    setTyped(id);
    return action(prev, formData);
  }, null);
  const [show, setShow] = useState(false);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const kind = isEmail(typed) ? 'staff' : isPhone(typed) ? 'member' : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="text-sm font-semibold">อีเมลหรือเบอร์มือถือ</label>
        <div className="relative">
          <UserRound aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input id="identifier" name="identifier" defaultValue={last} key={last} onChange={e => { setTyped(e.target.value); }} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="name@gym.com หรือ 08X-XXX-XXXX" aria-invalid={errors.identifier ? true : undefined} aria-describedby="identifier-hint" className={`${inputClass} pl-11`} />
        </div>
        <p id="identifier-hint" aria-live="polite" className={`flex min-h-5 flex-wrap items-center gap-1.5 text-xs ${errors.identifier ? 'text-danger' : 'text-muted'}`}>
          {errors.identifier ?? (kind === 'staff'
            ? <><span className="rounded-full bg-cyan/15 px-2 font-semibold text-cyan">พนักงาน</span>พาไปหน้าตามตำแหน่งในบัญชี</>
            : kind === 'member'
              ? <><span className="rounded-full bg-lime/15 px-2 font-semibold text-lime">สมาชิก</span>พาไปหน้าบัตรสมาชิก</>
              : 'พนักงานใช้อีเมล · สมาชิกใช้เบอร์มือถือที่สมัครไว้')}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">รหัสผ่าน</label>
        <div className="relative">
          <LockKeyhole aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'password-error' : undefined} className={`${inputClass} pr-12 pl-11`} />
          <button type="button" onClick={() => { setShow(s => !s); }} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={show} className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink">
            {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-danger">{errors.password}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
        <label className="flex min-h-11 items-center gap-2.5">
          <input type="checkbox" name="remember" className="size-5 accent-lime" />
          จดจำฉัน 30 วัน
        </label>
        <span className="text-muted">ลืมรหัส? <b className="font-semibold text-lime">ติดต่อผู้จัดการ</b></span>
      </div>
      {state && !state.ok && !state.fieldErrors && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className={`${btn.primary} min-h-12 w-full text-base`}>{pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted"><ShieldCheck aria-hidden className="size-4 text-lime" />เชื่อมต่อแบบเข้ารหัส · ห้ามใช้ &ldquo;จดจำฉัน&rdquo; บนเครื่องส่วนกลาง</p>
    </form>
  );
}
