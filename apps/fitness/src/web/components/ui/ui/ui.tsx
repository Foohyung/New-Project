import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { MembershipStatus } from '@/api/services/members/members/members.service';
import { STATUS_LABEL } from '@/api/services/members/members/members.service';
import { CountUp } from '@/web/components/layout/layout/layout.motion';

/* ---------- ปุ่มและช่องกรอก (ใช้ class เดียวกันทั้งแอป) ---------- */
export const btn = {
  primary: 'ff-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime px-4 font-semibold text-bg hover:brightness-110 disabled:opacity-60',
  secondary: 'ff-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 font-semibold text-ink hover:border-muted disabled:opacity-60',
  ghost: 'ff-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60',
  danger: 'ff-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 font-semibold text-danger hover:bg-danger/20 disabled:opacity-60',
} as const;

export const inputClass = 'min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none placeholder:text-faint focus:border-lime aria-[invalid=true]:border-danger';

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {title && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ kicker, title, actions, back }: { kicker?: string; title: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          // ปุ่มย้อนกลับแบบเม็ดยา เห็นชัดและแตะง่าย (≥ 44px) · ลูกศรเลื่อนซ้ายเล็กน้อยตอนชี้
          <Link
            href={back.href}
            className="group mb-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold text-ink transition-colors hover:border-lime/60 hover:bg-lime/10 hover:text-lime"
          >
            <span className="grid size-8 place-items-center rounded-full bg-lime/15 text-lime transition-transform group-hover:-translate-x-0.5">
              <ArrowLeft aria-hidden className="size-4" />
            </span>
            กลับไปหน้า{back.label}
          </Link>
        )}
        {kicker && <p className="text-sm text-muted">{kicker}</p>}
        <h1 className="font-display text-2xl font-semibold lg:text-[28px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">{children}</p>;
}

export function Forbidden({ message = 'บทบาทของคุณเปิดหน้านี้ไม่ได้' }: { message?: string }) {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-muted"><Lock aria-hidden className="size-6" /></span>
      <h1 className="font-display text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-muted">{message} สลับบทบาทได้ที่แถบโหมดทดลองด้านบน</p>
    </div>
  );
}

const AVATAR_COLORS = ['bg-cyan', 'bg-warn', 'bg-violet', 'bg-lime', 'bg-danger'] as const;
const LEADING_VOWELS = /^[เแโใไ]/;
const graphemes = new Intl.Segmenter('th', { granularity: 'grapheme' });

/** อักษรย่อจากชื่อ-นามสกุลภาษาไทย (ข้ามสระนำ และตัดเฉพาะพยัญชนะตัวแรกออกจากวรรณยุกต์) */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => {
      const first = Array.from(graphemes.segment(part), s => s.segment).find(g => !LEADING_VOWELS.test(g)) ?? '';
      return first.charAt(0);
    })
    .join('');
}

function hash(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return sum;
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const color = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  return (
    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-bg ${color ?? 'bg-lime'} ${className}`}>
      {initials(name)}
    </span>
  );
}

const STATUS_STYLE: Record<MembershipStatus, string> = {
  active: 'bg-lime/12 text-lime',
  expiring: 'bg-warn/15 text-warn',
  expired: 'bg-danger/15 text-danger',
  frozen: 'bg-violet/15 text-violet',
};

export function StatusBadge({ status }: { status: MembershipStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export type Tone = 'lime' | 'warn' | 'danger' | 'violet' | 'cyan' | 'muted';
const TONE: Record<Tone, string> = {
  lime: 'bg-lime/12 text-lime',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  violet: 'bg-violet/15 text-violet',
  cyan: 'bg-cyan/15 text-cyan',
  muted: 'bg-surface-2 text-muted',
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'lime' }) {
  return (
    <div className={tone === 'lime' ? 'flex flex-col gap-1 rounded-2xl bg-lime p-4 text-bg sm:p-5' : 'flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 sm:p-5'}>
      <span className={tone === 'lime' ? 'text-sm text-bg/75' : 'text-sm text-muted'}>{label}</span>
      <span className="font-display text-2xl font-semibold sm:text-3xl">{typeof value === 'string' || typeof value === 'number' ? <CountUp text={String(value)} /> : value}</span>
      {hint && <span className={tone === 'lime' ? 'text-sm text-bg/75' : 'text-sm text-muted'}>{hint}</span>}
    </div>
  );
}

/** แสดงคู่ ป้าย–ค่า ในหน้ารายละเอียด */
export function InfoList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-faint">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
