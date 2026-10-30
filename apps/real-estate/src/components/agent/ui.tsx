import { Lock } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/* ---------- ปุ่มและช่องกรอกของหลังบ้าน (แบบ 2 Marketplace) ---------- */
export const btn = {
  primary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60',
  secondary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold text-ink hover:border-ink disabled:opacity-60',
  ghost: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60',
  danger: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger-soft px-4 font-semibold text-danger disabled:opacity-60',
} as const;

export const inputClass = 'min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none placeholder:text-faint focus:border-accent aria-[invalid=true]:border-danger';

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {title && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ kicker, title, actions, back }: { kicker?: ReactNode; title: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
      <div className="min-w-0">
        {back && <Link href={back.href} className="mb-1 inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">← {back.label}</Link>}
        {kicker && <p className="text-sm text-muted">{kicker}</p>}
        <h1 className="text-2xl font-bold tracking-tight lg:text-[28px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">{children}</div>;
}

export function Forbidden() {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-muted"><Lock aria-hidden className="size-6" /></span>
      <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-muted">บทบาทของคุณเปิดหน้านี้ไม่ได้ ติดต่อผู้ดูแลระบบ</p>
    </div>
  );
}

export type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'violet' | 'mute';
const TONE: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  violet: 'bg-violet-soft text-violet',
  mute: 'bg-surface-2 text-muted',
};

export function Badge({ tone = 'mute', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums break-words sm:text-2xl ${tone ? TONE[tone].split(' ')[1] : ''}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
