import { bahtText, formatBaht, formatThaiDate, formatThaiDateOf, formatThaiTime } from '@repo/utils';
import Link from 'next/link';
import { METHOD_LABEL, promptPayPayload, VAT_RATE_PCT, vatFromInclusive } from '@/features/payments/service';
import { KIND_LABEL, type PaymentDto, type ShopProfile } from '@/features/payments/types';
import { LogoIcon } from './logo';
import { QrCode } from './qr-code';

const amountFmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amount = (satang: number) => amountFmt.format(satang / 100);

/* บนจอใช้สีตามธีมที่เลือก · ตอนพิมพ์ globals.css สลับ token เป็นโทนสว่างให้เอง */
const INK = 'text-ink';
const MUTED = 'text-muted';
const LINE = 'border-line';

/**
 * ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ (ชำระแล้ว) หรือใบแจ้งชำระเงินพร้อม QR (ยังไม่ชำระ)
 * ขนาดพอดี A4 เมื่อพิมพ์ (§15.2.8) — ส่วนอื่นของหน้าต้องใส่ print:hidden เอง
 */
export function ReceiptDocument({ payment: p, shop, memberHref }: { payment: PaymentDto; shop: ShopProfile; memberHref?: string }) {
  const paid = p.status === 'paid';
  const issuedAt = p.paidAt ?? p.createdAt;
  const { baseSatang, vatSatang } = vatFromInclusive(p.amountSatang);

  return (
    <article aria-label={paid ? `ใบเสร็จ ${p.receiptNo}` : `ใบแจ้งชำระ ${p.receiptNo}`} className={`receipt-paper mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl border border-line bg-surface ${INK} shadow-[0_24px_48px_-28px_#000]`}>
      <div aria-hidden className="h-1.5 bg-lime" />
      <div className="flex flex-col gap-6 p-5 sm:p-10 print:px-0 print:pt-5 print:pb-0">
        {/* ผู้ขาย + ชื่อเอกสาร */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <LogoIcon className="size-12 rounded-xl" />
            <div className="min-w-0 text-sm">
              <p className="font-display text-xl leading-tight font-bold tracking-[.08em]">{shop.brand}</p>
              <p className="font-medium">{shop.legalName} · {shop.branch}</p>
              <p className={MUTED}>{shop.address}</p>
              <p className={MUTED}>เลขประจำตัวผู้เสียภาษี {shop.taxId} · โทร {shop.phone}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className={`text-[11px] font-semibold tracking-[.18em] uppercase ${MUTED}`}>{paid ? 'Receipt / Tax invoice (ABB)' : 'Payment request'}</p>
            <h2 className="font-display text-2xl leading-tight font-semibold">{paid ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งชำระเงิน'}</h2>
            {paid && <p className="text-sm font-medium">ใบกำกับภาษีอย่างย่อ</p>}
            {paid && <p className={`mt-2 inline-block rounded border ${LINE} px-2 text-xs ${MUTED}`}>ต้นฉบับ</p>}
          </div>
        </header>

        {/* ลูกค้า + รายละเอียดเอกสาร */}
        <div className={`grid gap-4 rounded-xl border ${LINE} p-4 text-sm sm:grid-cols-2 sm:gap-6`}>
          <div>
            <p className={`text-xs ${MUTED}`}>ลูกค้า</p>
            {memberHref ? (
              <Link href={memberHref} className="tap inline-block font-semibold hover:underline print:no-underline">{p.memberName}</Link>
            ) : (
              <p className="font-semibold">{p.memberName}</p>
            )}
            <p className={MUTED}>รหัสสมาชิก {p.memberCode}</p>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5">
            <dt className={MUTED}>เลขที่</dt><dd className="font-semibold">{p.receiptNo}</dd>
            <dt className={MUTED}>วันที่</dt><dd>{formatThaiDateOf(issuedAt, 'long')} {formatThaiTime(issuedAt)} น.</dd>
            <dt className={MUTED}>ช่องทาง</dt><dd>{paid ? METHOD_LABEL[p.method] : 'PromptPay / โอนผ่านธนาคาร'}</dd>
          </dl>
        </div>

        {/* รายการ: จอเล็กซ่อนคอลัมน์จำนวน/ราคาต่อหน่วย แต่ตอนพิมพ์แสดงครบ */}
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className={`border-y ${LINE} bg-surface-2 text-xs ${MUTED}`}>
              <th scope="col" className="w-10 px-2 py-2.5 font-medium">ลำดับ</th>
              <th scope="col" className="px-2 py-2.5 font-medium">รายการ</th>
              <th scope="col" className="hidden w-16 px-2 py-2.5 text-right font-medium sm:table-cell print:table-cell">จำนวน</th>
              <th scope="col" className="hidden w-28 px-2 py-2.5 text-right font-medium sm:table-cell print:table-cell">ราคาต่อหน่วย</th>
              <th scope="col" className="w-28 px-2 py-2.5 text-right font-medium">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className={`border-b ${LINE} align-top`}>
              <td className="px-2 py-3">1</td>
              <td className="px-2 py-3">
                <p className="font-medium">{KIND_LABEL[p.kind]} · {p.packageName}</p>
                <p className={`text-xs ${MUTED}`}>
                  ระยะเวลา {p.packageDuration}
                  {p.coverage && <> · สิทธิ์ใช้งาน {formatThaiDate(p.coverage.from)} – {formatThaiDate(p.coverage.to)}</>}
                </p>
              </td>
              <td className="hidden px-2 py-3 text-right sm:table-cell print:table-cell">1</td>
              <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell print:table-cell">{amount(p.listPriceSatang)}</td>
              <td className="px-2 py-3 text-right tabular-nums">{amount(p.listPriceSatang)}</td>
            </tr>
            {p.couponCode && (
              <tr className={`border-b ${LINE} align-top`}>
                <td className="px-2 py-3">2</td>
                <td className="px-2 py-3">
                  <p className="font-medium">ส่วนลดคูปอง {p.couponCode}</p>
                  {p.bonusDays > 0 && <p className={`text-xs ${MUTED}`}>แถมวันใช้งาน {p.bonusDays} วัน (รวมในช่วงสิทธิ์แล้ว)</p>}
                </td>
                <td className="hidden px-2 py-3 text-right sm:table-cell print:table-cell">1</td>
                <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell print:table-cell">{p.discountSatang ? `−${amount(p.discountSatang)}` : '0.00'}</td>
                <td className="px-2 py-3 text-right tabular-nums">{p.discountSatang ? `−${amount(p.discountSatang)}` : '0.00'}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ยอดรวม + จำนวนเงินตัวอักษร */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-end">
          <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <p className={`text-xs ${MUTED}`}>จำนวนเงิน (ตัวอักษร)</p>
            <p className="font-semibold">({bahtText(p.amountSatang)})</p>
          </div>
          <dl className="flex flex-col gap-1 text-sm">
            {p.discountSatang > 0 && (
              <>
                <div className="flex justify-between gap-4"><dt className={MUTED}>รวมเป็นเงิน</dt><dd className="tabular-nums">{amount(p.listPriceSatang)}</dd></div>
                <div className="flex justify-between gap-4"><dt className={MUTED}>หักส่วนลด</dt><dd className="tabular-nums">−{amount(p.discountSatang)}</dd></div>
              </>
            )}
            <div className="flex justify-between gap-4"><dt className={MUTED}>มูลค่าก่อนภาษี</dt><dd className="tabular-nums">{amount(baseSatang)}</dd></div>
            <div className="flex justify-between gap-4"><dt className={MUTED}>ภาษีมูลค่าเพิ่ม {VAT_RATE_PCT}%</dt><dd className="tabular-nums">{amount(vatSatang)}</dd></div>
            <div className={`mt-1 flex items-baseline justify-between gap-4 border-t ${LINE} pt-2`}>
              <dt className="font-semibold">รวมทั้งสิ้น</dt>
              <dd className="font-display text-xl leading-tight font-semibold tabular-nums">{formatBaht(p.amountSatang, { showSatang: true })}</dd>
            </div>
          </dl>
        </div>

        {paid ? (
          <div className={`grid items-end gap-6 border-t border-dashed ${LINE} pt-6 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]`}>
            <div aria-label="สถานะ: ชำระแล้ว" className="w-fit -rotate-6 rounded-lg border-2 border-lime px-4 py-1.5 text-center text-lime">
              <p className="font-display text-lg leading-tight font-bold tracking-[.12em]">PAID</p>
              <p className="text-xs font-semibold">ชำระแล้ว {formatThaiDateOf(issuedAt)}</p>
            </div>
            <Signature label="ผู้รับเงิน" name={p.receivedBy ?? 'ระบบชำระเงินอัตโนมัติ'} />
            <Signature label="ผู้ชำระเงิน" name={p.memberName} />
          </div>
        ) : (
          <div className={`flex flex-col items-center gap-4 rounded-xl border ${LINE} p-4 text-center sm:flex-row sm:text-left`}>
            <QrCode value={promptPayPayload(shop.promptPayId, p.amountSatang)} label={`QR PromptPay ยอด ${formatBaht(p.amountSatang, { showSatang: true })}`} className="size-40 shrink-0 border border-line p-2" />
            <div className="min-w-0 text-sm">
              <p className="mb-1 inline-block rounded bg-[#113566] px-2 py-0.5 text-xs font-bold tracking-wide text-white">PromptPay</p>
              <p className="font-display text-2xl font-semibold">{formatBaht(p.amountSatang, { showSatang: true })}</p>
              <p className={MUTED}>สแกนด้วยแอปธนาคารใดก็ได้ ยอดเงินถูกกรอกให้อัตโนมัติ</p>
              <p className={MUTED}>อ้างอิง {p.receiptNo} · สิทธิ์เริ่มเมื่อร้านยืนยันเงินเข้า</p>
            </div>
          </div>
        )}

        <footer className={`flex flex-col gap-1 border-t ${LINE} pt-4 text-xs ${MUTED} sm:flex-row sm:justify-between`}>
          <p>ราคารวมภาษีมูลค่าเพิ่มแล้ว · ขอบคุณที่ใช้บริการ {shop.brand}</p>
          <p>เอกสารออกโดยระบบ (โหมดทดลอง — ไม่ใช่ใบกำกับภาษีจริง)</p>
        </footer>
      </div>
    </article>
  );
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div className="text-center text-sm">
      <div className={`mx-auto mb-1 h-10 max-w-56 border-b border-muted`} />
      <p className="font-medium">({name})</p>
      <p className={`text-xs ${MUTED}`}>{label}</p>
    </div>
  );
}
