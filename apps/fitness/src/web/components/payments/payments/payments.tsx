import { formatBaht } from '@/api/lib/utils/utils/utils';
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from '@/api/services/payments/payments/payments.service';
import { QrCode } from '@/web/components/ui/ui/ui.qr-code';
import Image from 'next/image';
import { Badge, type Tone } from '@/web/components/ui/ui/ui';

const STATUS_TONE: Record<PaymentStatus, Tone> = { paid: 'lime', review: 'warn', pending: 'cyan' };

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

/** QR PromptPay แบบระบุยอดเงิน — สแกนด้วยแอปธนาคารใดก็ได้ */
export function PromptPayCard({ payload, qrImageUrl, amountSatang, note }: { payload?: string; qrImageUrl?: string | null; amountSatang: number; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center text-[#0b0d10]">
      <p className="rounded-md bg-[#113566] px-3 py-1 text-sm font-bold tracking-wide text-white">PromptPay</p>
      {qrImageUrl ? (
        <Image src={qrImageUrl} alt="QR PromptPay" width={240} height={240} unoptimized className="size-52 bg-white object-contain sm:size-60" />
      ) : payload ? (
        <QrCode value={payload} label={`QR PromptPay ยอด ${formatBaht(amountSatang, { showSatang: true })}`} className="size-52 sm:size-60" />
      ) : (
        <p role="alert" className="rounded-xl bg-warn/10 p-4 text-sm text-warn">สาขานี้ยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อเจ้าหน้าที่</p>
      )}
      <p className="font-display text-3xl font-semibold">{formatBaht(amountSatang, { showSatang: true })}</p>
      {qrImageUrl && <p className="text-sm text-[#5d6573]">กรุณากรอกยอดเงินนี้ก่อนยืนยันการโอน</p>}
      {note && <p className="text-sm text-[#5d6573]">{note}</p>}
    </div>
  );
}
