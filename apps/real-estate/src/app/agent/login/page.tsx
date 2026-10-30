import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/agent/login-form';
import { AGENT_HOME, safeNextPath } from '@/features/auth/service';
import { getSession } from '@/server/agent/auth';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ Agent', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNextPath(next) ?? AGENT_HOME);
  return (
    <div className="agent grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-accent">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-accent text-on-accent">⌂</span>BaanHub
          <span className="rounded-md bg-surface-2 px-2 text-sm font-semibold text-muted">Agent</span>
        </p>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-bold">เข้าสู่ระบบหลังบ้าน</h1>
          <p className="mt-1 text-sm text-muted">จัดการสต็อกทรัพย์ สัญญา เอกสาร และค่าคอม</p>
          <LoginForm next={safeNextPath(next) ?? ''} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">บัญชีทดลอง: kritsada@baanhub.test · thana@baanhub.test · admin@baanhub.test (รหัสผ่านตาม DEMO_PASSWORD)</p>
      </div>
    </div>
  );
}
