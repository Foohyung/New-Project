'use client';

import { useActionState } from 'react';
import { sendContact, type ContactState } from '@/features/contact/actions';

export function ContactForm({ homeSlug }: { homeSlug: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, null);
  const err = state?.ok === false ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div role="status" className="rounded-2xl bg-go-soft p-5">
        <p className="text-lg font-semibold text-go-strong">ขอบคุณที่สนใจ</p>
        <p className="mt-1">{state.message}</p>
      </div>
    );
  }

  const field = 'min-h-12 w-full rounded-xl border border-[#c6cedc] bg-surface px-4 outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 aria-invalid:border-danger';
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="homeSlug" value={homeSlug} />
      {/* honeypot: ซ่อนจากคน แต่ bot มักกรอก (§10.6) */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>เว็บไซต์<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div>
        <label htmlFor="c-name" className="mb-1 block text-sm font-medium">ชื่อ</label>
        <input id="c-name" name="name" autoComplete="name" required aria-invalid={Boolean(err?.name)} aria-describedby={err?.name ? 'e-name' : undefined} className={field} />
        {err?.name && <p id="e-name" className="mt-1 text-sm text-danger">{err.name}</p>}
      </div>
      <div>
        <label htmlFor="c-phone" className="mb-1 block text-sm font-medium">เบอร์มือถือ</label>
        <input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08X-XXX-XXXX" required aria-invalid={Boolean(err?.phone)} aria-describedby={err?.phone ? 'e-phone' : undefined} className={field} />
        {err?.phone && <p id="e-phone" className="mt-1 text-sm text-danger">{err.phone}</p>}
      </div>
      <div>
        <label htmlFor="c-msg" className="mb-1 block text-sm font-medium">ข้อความ <span className="font-normal text-muted">(ไม่บังคับ)</span></label>
        <textarea id="c-msg" name="message" rows={3} maxLength={1000} placeholder="เช่น ขอนัดชมวันเสาร์ช่วงบ่าย" className={`${field} py-3`} />
      </div>
      <label className="flex gap-3 text-sm text-muted">
        <input type="checkbox" name="consent" required aria-invalid={Boolean(err?.consent)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>ยินยอมให้ BaanHub และ agent ใช้ข้อมูลนี้เพื่อติดต่อกลับเรื่องประกาศนี้ ตามนโยบายความเป็นส่วนตัว{err?.consent && <b className="block font-semibold text-danger">{err.consent}</b>}</span>
      </label>
      {state?.ok === false && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-go px-6 font-semibold text-white hover:bg-go-strong disabled:opacity-60">
        {pending ? 'กำลังส่ง…' : 'ขอนัดชม / สอบถาม'}
      </button>
    </form>
  );
}
