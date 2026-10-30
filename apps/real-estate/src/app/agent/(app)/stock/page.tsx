import { formatThaiDate } from '@repo/utils';
import { Columns3, LayoutGrid, Plus, Search, Table2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { priceText, sizeText, StatusBadge, UnitCard } from '@/components/agent/stock';
import { UrlDropdown } from '@/components/agent/url-dropdown';
import { Badge, btn, EmptyState, inputClass, PageHeader } from '@/components/agent/ui';
import { hrefWith, Toolbar, ViewSwitch, type Params } from '@/components/agent/view-switch';
import { commissionLabel, countByStatus, filterUnits, parseStockFilter } from '@/features/stock/service';
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPES, UNIT_STATUS_LABEL, UNIT_STATUSES } from '@/features/stock/types';
import { requireSession } from '@/server/agent/auth';
import { listUnits } from '@/server/dal/agent-stock';

export const metadata: Metadata = { title: 'ทรัพย์และยูนิต' };

const VIEWS = [
  { value: 'table', label: 'ตาราง', icon: <Table2 className="size-4" /> },
  { value: 'cards', label: 'การ์ด', icon: <LayoutGrid className="size-4" /> },
  { value: 'board', label: 'บอร์ดสถานะ', icon: <Columns3 className="size-4" /> },
];
export default async function StockPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireSession();
  const params = await searchParams;
  const view = VIEWS.some(v => v.value === params.view) ? (params.view as string) : 'table';
  const filter = parseStockFilter(params);
  const all = await listUnits(session);
  const counts = countByStatus(filterUnits(all, { ...filter, status: undefined }));
  const rows = filterUnits(all, filter);
  const keep: Params = { view: params.view, status: filter.status, type: filter.type, q: filter.q };
  const path = '/agent/stock';

  return (
    <>
      <PageHeader title="ทรัพย์และยูนิต" kicker={`${String(new Set(all.map(u => u.propertyId)).size)} ทรัพย์ · ${String(all.length)} ยูนิตในความดูแล`} actions={<Link href="/agent/stock/new" className={btn.primary}><Plus aria-hidden className="size-4" />เพิ่มทรัพย์</Link>} />

      <Toolbar>
        <ViewSwitch views={VIEWS} current={view} hrefFor={v => hrefWith(path, keep, { view: v === 'table' ? undefined : v })} />
        <UrlDropdown
          label="ประเภท"
          value={filter.type ?? ''}
          options={[{ value: '', label: 'ทุกประเภท', href: hrefWith(path, keep, { type: undefined }) }, ...PROPERTY_TYPES.map(t => ({ value: t, label: PROPERTY_TYPE_LABEL[t], href: hrefWith(path, keep, { type: t }) }))]}
        />
        <form action={path} className="flex min-w-0 flex-1 basis-56 gap-2" role="search">
          {Object.entries(keep).filter(([k, v]) => k !== 'q' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label className="sr-only" htmlFor="stock-q">ค้นหาทรัพย์</label>
          <input id="stock-q" name="q" defaultValue={filter.q} placeholder="ค้นหาชื่อ รหัส เลขห้อง เจ้าของ" className={`${inputClass} min-h-11`} />
          <button type="submit" aria-label="ค้นหา" className={`${btn.secondary} px-3`}><Search aria-hidden className="size-4" /></button>
        </form>
      </Toolbar>

      <nav aria-label="กรองตามสถานะ" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {[undefined, ...UNIT_STATUSES].map(s => (
          <Link key={s ?? 'all'} href={hrefWith(path, keep, { status: s })} aria-current={filter.status === s ? 'page' : undefined} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-muted aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-bg">
            {s ? UNIT_STATUS_LABEL[s] : 'ทั้งหมด'} <span className="tabular-nums opacity-75">{s ? counts[s] : Object.values(counts).reduce((a, b) => a + b, 0)}</span>
          </Link>
        ))}
      </nav>

      <p className="-mt-2 text-sm text-muted" aria-live="polite">พบ {rows.length} ยูนิต</p>

      {rows.length === 0 ? (
        <EmptyState>ไม่พบยูนิตตามตัวกรองนี้ — <Link href={path} className="font-semibold text-accent underline">ล้างตัวกรอง</Link> หรือ <Link href="/agent/stock/new" className="font-semibold text-accent underline">เพิ่มทรัพย์ใหม่</Link></EmptyState>
      ) : view === 'board' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {UNIT_STATUSES.map(s => {
            const list = rows.filter(r => r.status === s);
            return (
              <section key={s} aria-label={UNIT_STATUS_LABEL[s]} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 p-2.5">
                <h2 className="flex items-center justify-between px-1 text-sm font-bold"><StatusBadge status={s} /><span className="tabular-nums text-muted">{list.length}</span></h2>
                {list.map(u => <UnitCard key={u.id} u={u} compact />)}
                {!list.length && <p className="px-1 pb-1 text-sm text-faint">— ไม่มี —</p>}
              </section>
            );
          })}
        </div>
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(u => <UnitCard key={u.id} u={u} />)}</div>
      ) : (
        <>
          {/* มือถือ: ตารางเปลี่ยนเป็นการ์ด (§15.7) */}
          <div className="grid gap-3 md:hidden">{rows.map(u => <UnitCard key={u.id} u={u} />)}</div>
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr><th className="sticky left-0 bg-surface px-4 py-3 font-semibold">ทรัพย์ / ยูนิต</th><th className="px-3 py-3 font-semibold">ขนาด</th><th className="px-3 py-3 font-semibold">เจ้าของ</th><th className="px-3 py-3 text-right font-semibold">ราคา</th><th className="px-3 py-3 font-semibold">ค่าคอมที่ตกลง</th><th className="px-3 py-3 font-semibold">สถานะ</th></tr>
              </thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="sticky left-0 bg-inherit px-4 py-3">
                      <Link href={`/agent/stock/${u.property.code}`} className="font-semibold hover:text-accent">{u.property.name} <span className="text-muted">· {u.label}</span></Link>
                      <div className="text-xs text-muted">{u.property.code} · {PROPERTY_TYPE_LABEL[u.property.type]}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{sizeText(u)}</td>
                    <td className="px-3 py-3">{u.owner.name}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{priceText(u)}</td>
                    <td className="px-3 py-3">{commissionLabel(u.commission)}{u.exclusive && <> <Badge tone="accent">Exclusive</Badge></>}</td>
                    <td className="px-3 py-3"><StatusBadge status={u.status} />{u.leaseEnd && <div className="mt-0.5 text-xs text-muted">ถึง {formatThaiDate(u.leaseEnd)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
