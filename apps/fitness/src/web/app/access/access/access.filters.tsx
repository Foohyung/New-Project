'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { DatePickerField, DatePickerGroup } from '@/web/components/ui/ui/ui.calendar';
import { btn, inputClass } from '@/web/components/ui/ui/ui';

export function AccessLogFilters({ from, to, ip, today }: {
  from: string;
  to: string;
  ip?: string;
  today: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const valueOf = (name: string) => {
    const value = formRef.current ? new FormData(formRef.current).get(name) : null;
    return typeof value === 'string' ? value : '';
  };

  const apply = (dates: { from?: string; to?: string } = {}) => {
    const nextFrom = dates.from ?? valueOf('from');
    const nextTo = dates.to ?? valueOf('to');
    const nextIp = valueOf('ip').trim();
    const query = new URLSearchParams({ from: nextFrom, to: nextTo });
    if (nextIp) query.set('ip', nextIp);
    startTransition(() => {
      router.push(`/access-logs?${query.toString()}`, { scroll: false });
    });
  };

  return (
    <>
      <form
        ref={formRef}
        method="get"
        onSubmit={event => {
          event.preventDefault();
          apply();
        }}
        aria-busy={pending}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
      >
        <DatePickerGroup className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div className="w-full sm:w-56">
            <DatePickerField name="from" label="จากวันที่" defaultValue={from} max={today} today={today} onSelect={date => { apply({ from: date }); }} />
          </div>
          <div className="w-full sm:w-56">
            <DatePickerField name="to" label="ถึงวันที่" defaultValue={to} max={today} today={today} onSelect={date => { apply({ to: date }); }} />
          </div>
        </DatePickerGroup>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          IP <span className="sr-only">(ไม่บังคับ)</span>
          <input key={ip ?? ''} type="text" name="ip" defaultValue={ip ?? ''} placeholder="เช่น 203.0.113.5" inputMode="decimal" autoComplete="off" className={`${inputClass} w-full sm:w-56`} />
        </label>
      </form>
      {ip && <Link href={`/access-logs?from=${from}&to=${to}`} className={`${btn.secondary} w-fit`}>ล้างตัวกรอง IP</Link>}
    </>
  );
}
