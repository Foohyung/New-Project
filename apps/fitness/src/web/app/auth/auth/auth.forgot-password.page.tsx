import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { requestPasswordResetAction } from '@/api/actions/auth/auth/auth.actions';
import { ForgotPasswordForm } from '@/web/components/auth/auth/auth.change-password-form';
import { btn } from '@/web/components/ui/ui/ui';

export const metadata: Metadata = { title: 'ลืมรหัสผ่าน' };

/** (สาธารณะ) ลืมรหัสผ่าน — ส่งคำขอให้พนักงานรีเซ็ตเป็นรหัสชั่วคราว */
export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4">
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-lime/15 text-lime"><KeyRound aria-hidden className="size-7" /></span>
            <h1 className="font-display text-2xl font-semibold">ลืมรหัสผ่าน</h1>
            <p className="text-sm text-muted">กรอกอีเมลหรือเบอร์โทรที่ใช้เข้าสู่ระบบ ระบบจะส่งคำขอให้พนักงานรีเซ็ตเป็นรหัสชั่วคราว แล้วคุณตั้งรหัสใหม่ตอนเข้าสู่ระบบ</p>
          </div>
          <div className="mt-5"><ForgotPasswordForm action={requestPasswordResetAction} /></div>
        </section>
        <Link href="/login" className={`${btn.ghost} self-center`}><ArrowLeft aria-hidden className="size-5" />กลับไปหน้าเข้าสู่ระบบ</Link>
      </div>
    </main>
  );
}
