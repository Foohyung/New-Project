import { formatBaht, formatThaiTime } from '@repo/utils';
import { DoorOpen, Receipt, Send, UserPlus, Wrench, Zap } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { Card, FloorTabs, RoomLegend, RoomTile } from '@/components/rooms';
import { TodoList } from '@/components/todo-list';
import { requireSession } from '@/server/auth';
import { getSummary, listRooms, listTodos, recentPayments } from '@/server/dal/rooms';

const Params = z.object({ floor: z.coerce.number().int().min(1).max(4).catch(3) });

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const { floor } = Params.parse({ floor: (await searchParams).floor ?? 3 });
  const [summary, floorRooms, payments, todos] = await Promise.all([getSummary(session), listRooms(session, floor), recentPayments(session), listTodos(session)]);
  const floorOccupied = floorRooms.filter(r => r.status !== 'vacant' && r.status !== 'repair').length;
  const floorOverdue = floorRooms.filter(r => r.status === 'overdue').length;

  const stats = [
    { icon: DoorOpen, value: `${summary.vacant} ห้อง`, label: 'ว่าง พร้อมเข้าอยู่', tone: 'bg-sky-soft text-sky' },
    { icon: UserPlus, value: '2 คน', label: 'ผู้เช่าใหม่เดือนนี้', tone: 'bg-mint text-green' },
    { icon: Wrench, value: `${summary.openRepairs} งาน`, label: 'แจ้งซ่อมค้าง · ด่วน 1', tone: 'bg-coral-soft text-coral' },
    { icon: Zap, value: `${summary.avgElectricUnits} หน่วย`, label: 'ค่าไฟเฉลี่ยต่อห้อง', tone: 'bg-sun-soft text-[#9a6a00]' },
  ];

  return (
    <>
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-green to-[#2eb88a] p-6 text-white sm:p-8">
        <p className="opacity-90">รอบบิล {summary.billingMonth} · ครบกำหนด 5 ต.ค.</p>
        <h1 className="mt-1 mb-3.5 font-display text-[26px] font-medium sm:text-[32px]">
          เก็บค่าเช่าได้แล้ว <b className="font-semibold text-sun">{summary.rate}%</b>
        </h1>
        <div className="h-3.5 max-w-xl overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={summary.rate} aria-valuemin={0} aria-valuemax={100} aria-label="สัดส่วนที่เก็บเงินได้">
          <span className="block h-full rounded-full bg-white" style={{ width: `${summary.rate}%` }} />
        </div>
        <p className="mt-2 opacity-90">{formatBaht(summary.collected)} จาก {formatBaht(summary.billed)} · เหลืออีก {summary.remainingRooms} ห้อง</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/bills?status=overdue" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-green-deep">
            <Send aria-hidden className="size-4" />ค้างชำระ ({summary.overdue.count})
          </Link>
          <Link href="/bills?status=slip" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/20 px-5 font-semibold">
            <Receipt aria-hidden className="size-4" />ตรวจสลิป ({summary.slip.count})
          </Link>
        </div>
      </section>

      <section aria-label="สรุป" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, value, label, tone }) => (
          <div key={label} className="flex items-center gap-3.5 rounded-[22px] bg-surface p-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon aria-hidden className="size-5" /></span>
            <div><b className="font-display text-2xl font-medium">{value}</b><small className="block text-sm text-muted">{label}</small></div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          title="ผังห้อง"
          subtitle={`ชั้น ${floor} · มีผู้เช่า ${floorOccupied}/16 ห้อง · ค้างชำระ ${floorOverdue}`}
          action={<FloorTabs current={floor} basePath="/" />}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {floorRooms.map(room => <RoomTile key={room.no} room={room} />)}
          </div>
          <RoomLegend />
          <Link href="/rooms" className="mt-3 inline-flex min-h-11 items-center font-semibold text-green">ดูผังห้องทุกชั้น →</Link>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="ต้องทำวันนี้" subtitle={`${todos.filter(t => !t.done).length} รายการ`}>
            <TodoList items={todos} />
          </Card>
          <Card title="รับชำระล่าสุด">
            <ul className="flex flex-col gap-1">
              {payments.map(p => (
                <li key={p.invoiceNo}>
                  <Link href={`/rooms/${p.roomNo}`} className="flex min-h-14 items-center gap-3 rounded-2xl py-1.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint font-display font-medium text-green-deep">{p.roomNo}</span>
                    <span className="min-w-0 flex-1">คุณ{p.tenantNickname}<small className="block text-xs text-muted">PromptPay · {p.paidAt ? formatThaiTime(p.paidAt) : ''}</small></span>
                    <b className="font-display font-medium">{formatBaht(p.total)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
