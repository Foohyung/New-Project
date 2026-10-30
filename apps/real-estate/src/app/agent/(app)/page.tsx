import { daysBetween, formatBaht, formatThaiDate } from '@repo/utils';
import { CalendarClock, FilePlus2, FileWarning, KeyRound, Plus, Upload, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MonthChart } from '@/components/agent/month-chart';
import { Badge, btn, Card, PageHeader, Stat } from '@/components/agent/ui';
import { DOC_CATEGORY_LABEL } from '@/features/documents/service';
import { UNIT_STATUS_LABEL, UNIT_STATUSES } from '@/features/stock/types';
import { requireSession } from '@/server/agent/auth';
import { getDashboard } from '@/server/dal/agent-dashboard';

export const metadata: Metadata = { title: 'ภาพรวม' };

export default async function AgentDashboard() {
  const session = await requireSession();
  const d = await getDashboard(session);
  const todo = [
    ...d.needContract.map(u => ({ key: `c-${u.id}`, icon: FilePlus2, tone: 'warn' as const, title: `${u.property.name} · ${u.label} จองแล้วแต่ยังไม่มีสัญญา`, detail: `เจ้าของ ${u.owner.name}`, href: `/agent/contracts/new?type=${u.salePrice ? 'sale' : 'lease'}&unit=${u.id}`, cta: 'สร้างสัญญา' })),
    ...d.expiringDocs.map(doc => {
      const left = doc.expiresAt ? daysBetween(d.today, doc.expiresAt) : 0;
      return { key: `d-${doc.id}`, icon: FileWarning, tone: left < 0 ? ('danger' as const) : ('warn' as const), title: `${DOC_CATEGORY_LABEL[doc.category]} ${left < 0 ? 'หมดอายุแล้ว' : `หมดอายุใน ${String(left)} วัน`}`, detail: `${doc.name} · ${doc.linkLabel}`, href: `/agent/documents?link=${doc.linkType}:${doc.linkId}`, cta: 'ดูเอกสาร' };
    }),
    ...d.leasesEnding.map(u => ({ key: `l-${u.id}`, icon: CalendarClock, tone: 'accent' as const, title: `สัญญาเช่า ${u.property.name} · ${u.label} ครบ ${formatThaiDate(u.leaseEnd ?? d.today)}`, detail: 'ติดต่อผู้เช่าเรื่องต่อสัญญา หรือเตรียมหาผู้เช่าใหม่', href: `/agent/stock/${u.property.code}`, cta: 'ดูทรัพย์' })),
  ];
  return (
    <>
      <PageHeader
        kicker={`สวัสดี ${session.name} · ${formatThaiDate(d.today, 'long')}`}
        title="ภาพรวมงานของคุณ"
        actions={<>
          <Link href="/agent/stock/new" className={btn.secondary}><Plus aria-hidden className="size-4" />เพิ่มทรัพย์</Link>
          <Link href="/agent/contracts/new" className={btn.primary}><FilePlus2 aria-hidden className="size-4" />สร้างสัญญา</Link>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ทรัพย์ในสต็อก" value={`${String(d.propertyCount)} รายการ`} hint={`${String(d.unitCount)} ยูนิต`} />
        <Stat label="ยูนิตว่างพร้อมขาย/เช่า" value={`${String(d.byStatus.available)} ยูนิต`} hint={`จอง ${String(d.byStatus.reserved)} · ต่อรอง ${String(d.byStatus.negotiating)}`} tone="ok" />
        <Stat label="ค่าคอมเดือนนี้" value={formatBaht(d.commissionThisMonth)} hint={`กำไรสุทธิ ${formatBaht(d.netThisMonth)}`} tone="accent" />
        <Stat label="ค่าคอมค้างรับ" value={formatBaht(d.pendingCommission)} hint="รอวันโอน/วันทำสัญญา" tone="warn" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card title="ต้องจัดการ" subtitle={todo.length ? `${String(todo.length)} รายการ` : 'ไม่มีงานค้าง'}>
          <ul className="flex flex-col">
            {todo.map(t => (
              <li key={t.key} className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${{ warn: 'bg-warn-soft text-warn', danger: 'bg-danger-soft text-danger', accent: 'bg-accent-soft text-accent' }[t.tone]}`}><t.icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{t.title}</p>
                  <p className="truncate text-sm text-muted">{t.detail}</p>
                </div>
                <Link href={t.href} className={`${btn.secondary} shrink-0 px-3 text-sm`}>{t.cta}</Link>
              </li>
            ))}
            {!todo.length && <li className="text-muted">ทุกอย่างเรียบร้อย 🎉</li>}
          </ul>
        </Card>
        <Card title="รายรับ-รายจ่าย 6 เดือน" action={<Link href="/agent/ledger" className={`${btn.ghost} text-sm`}><Wallet aria-hidden className="size-4" />ดูบัญชี</Link>}>
          <MonthChart data={d.months} />
        </Card>
      </div>
      <Card title="สถานะยูนิตทั้งหมด">
        <div className="flex flex-wrap gap-2">
          {UNIT_STATUSES.map(s => (
            <Link key={s} href={`/agent/stock?status=${s}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 hover:border-accent">
              <Badge tone={s === 'available' ? 'ok' : s === 'reserved' ? 'warn' : s === 'negotiating' ? 'accent' : 'mute'}>{UNIT_STATUS_LABEL[s]}</Badge>
              <b className="tabular-nums">{d.byStatus[s]}</b>
            </Link>
          ))}
          <Link href="/agent/documents" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 hover:border-accent"><Upload aria-hidden className="size-4 text-muted" />อัปโหลดเอกสาร</Link>
          <Link href="/agent/contracts" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 hover:border-accent"><KeyRound aria-hidden className="size-4 text-muted" />สัญญาทั้งหมด</Link>
        </div>
      </Card>
    </>
  );
}
