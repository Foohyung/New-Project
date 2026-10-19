import { formatBaht, formatThaiDate } from '@repo/utils';
import { ChevronLeft, MessageCircle, Wrench } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Card, STATUS_BADGE } from '@/components/rooms';
import { ROOM_STATUS_LABEL } from '@/features/rooms/types';
import { requireSession } from '@/server/auth';
import { getRoom } from '@/server/dal/rooms';

const RoomNo = z.coerce.number().int().min(101).max(416);

type Props = { params: Promise<{ no: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `ห้อง ${(await params).no}` };
}

export default async function RoomPage({ params }: Props) {
  const session = await requireSession();
  const parsed = RoomNo.safeParse((await params).no);
  if (!parsed.success) notFound();
  const room = await getRoom(session, parsed.data);
  if (!room) notFound();

  return (
    <>
      <Link href="/rooms" className="inline-flex min-h-11 w-fit items-center gap-1 font-medium text-muted"><ChevronLeft aria-hidden className="size-5" />ห้องพักทั้งหมด</Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-medium">ห้อง {room.no}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_BADGE[room.status]}`}>
          {ROOM_STATUS_LABEL[room.status]}{room.status === 'overdue' ? ` ${room.overdueDays} วัน` : ''}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card title={room.invoiceNo ? `ใบแจ้งหนี้ ${room.invoiceNo}` : 'ไม่มีใบแจ้งหนี้รอบนี้'} subtitle={room.invoiceNo ? `ครบกำหนด ${formatThaiDate(room.dueOn)}` : room.repairNote ?? 'ห้องว่าง'}>
          {room.lines.length > 0 && (
            <>
              <table className="w-full border-collapse">
                <caption className="sr-only">รายการในใบแจ้งหนี้</caption>
                <tbody className="divide-y divide-line">
                  {room.lines.map(line => (
                    <tr key={line.label}>
                      <th scope="row" className="py-3 text-left font-normal">{line.label}{line.detail && <small className="block text-xs text-muted">{line.detail}</small>}</th>
                      <td className="py-3 text-right tabular-nums">{formatBaht(line.amount, { showSatang: true })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-dashed border-line">
                    <th scope="row" className="pt-3 text-left font-display text-lg font-medium">รวม</th>
                    <td className="pt-3 text-right font-display text-2xl font-medium">{formatBaht(room.total ?? 0, { showSatang: true })}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#06c755] px-5 font-semibold text-white">
                  <MessageCircle aria-hidden className="size-4" />ส่งบิลทาง LINE
                </button>
                <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-line px-5 font-semibold">บันทึกรับชำระ</button>
              </div>
              <p className="mt-2 text-xs text-muted">ปุ่มส่งบิลและบันทึกรับชำระจะเชื่อม LINE OA และฐานข้อมูลในระยะที่ 2</p>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          {room.tenantName && (
            <Card title="ผู้เช่า">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted">ชื่อ</dt><dd>{room.tenantName}</dd>
                <dt className="text-muted">เบอร์โทร</dt><dd className="tabular-nums">{room.tenantPhoneMasked}</dd>
                <dt className="text-muted">เข้าอยู่</dt><dd>{room.moveInOn ? formatThaiDate(room.moveInOn) : '—'}</dd>
                <dt className="text-muted">ชำระล่าสุด</dt><dd>{room.paidAt ? formatThaiDate(room.paidAt.slice(0, 10)) : 'ยังไม่ชำระรอบนี้'}</dd>
              </dl>
            </Card>
          )}
          {room.electric && room.water && (
            <Card title="มิเตอร์รอบนี้">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sun-soft p-3.5"><dt className="text-sm text-muted">ไฟฟ้า</dt><dd className="font-display text-xl font-medium">{room.electric.units} หน่วย</dd><dd className="text-xs text-muted tabular-nums">{room.electric.previous} → {room.electric.current}</dd></div>
                <div className="rounded-2xl bg-sky-soft p-3.5"><dt className="text-sm text-muted">น้ำ</dt><dd className="font-display text-xl font-medium">{room.water.units} หน่วย</dd><dd className="text-xs text-muted tabular-nums">{room.water.previous} → {room.water.current}</dd></div>
              </dl>
              {room.electric.current < room.electric.previous && <p className="mt-3 text-sm text-muted">มิเตอร์ไฟวนรอบหลัง 9999 ระบบคิดหน่วยให้ถูกต้องแล้ว</p>}
            </Card>
          )}
          {room.repairNote && (
            <Card title="แจ้งซ่อม / ปรับปรุง">
              <p className="flex items-center gap-2"><Wrench aria-hidden className="size-5 text-coral" />{room.repairNote}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
