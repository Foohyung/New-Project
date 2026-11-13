'use client';

import { useState } from 'react';
import { formatBaht } from '@/api/lib/utils/utils/utils';
import { PromptPayCard } from '@/web/components/payments/payments/payments';
import { btn, Card } from '@/web/components/ui/ui/ui';

interface PromptPayCheckoutProps {
  payload?: string;
  qrImageUrl?: string | null;
  amountSatang: number;
  note?: string;
  onQrShown?: () => void;
}

export function PromptPayCheckout({ payload, qrImageUrl, amountSatang, note, onQrShown }: PromptPayCheckoutProps) {
  const [showQr, setShowQr] = useState(false);

  if (showQr) {
    return <PromptPayCard payload={payload} qrImageUrl={qrImageUrl} amountSatang={amountSatang} note={note} />;
  }

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <div>
        <p className="font-display text-lg font-semibold">พร้อมชำระเงินหรือยัง?</p>
        <p className="mt-1 text-sm text-muted">ยอดชำระ {formatBaht(amountSatang, { showSatang: true })}</p>
      </div>
      <button type="button" onClick={() => { setShowQr(true); onQrShown?.(); }} className={`${btn.primary} w-full`}>
        ชำระเงินด้วย PromptPay
      </button>
    </Card>
  );
}
