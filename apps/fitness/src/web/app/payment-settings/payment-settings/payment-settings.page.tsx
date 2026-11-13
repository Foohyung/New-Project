import type { Metadata } from 'next';
import { savePaymentSettingsAction } from '@/api/actions/payments/payments/payment-settings.actions';
import { saveReceiptSettingsAction } from '@/api/actions/payments/payments/receipt-settings.actions';
import { getReceiptSettings } from '@/api/dal/payments/payments/payments.shop';
import { ReceiptSettingsForm } from '@/web/components/payments/payments/receipt-settings.form';
import { getPaymentSettings, paymentSettingsBranches } from '@/api/dal/payments/payments/payments.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { PaymentSettingsForm } from '@/web/components/payments/payments/payment-settings.form';
import { Card, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import Link from 'next/link';
import { today } from '@/api/lib/clock/clock/clock';

export const metadata: Metadata = { title: 'ตั้งค่าการชำระเงิน' };

export default async function PaymentSettingsPage({ searchParams }: { searchParams: Promise<{ branch?: string | string[] }> }) {
  const { session, allowed } = await pageGuard('payments.configure');
  if (!allowed || (session.role !== 'admin' && session.role !== 'owner')) return accessDenied();
  const search = await searchParams;
  const requested = typeof search.branch === 'string' ? search.branch : session.branch;
  const options = await paymentSettingsBranches(session);
  const branch = options.includes(requested) ? requested : session.branch;
  const [settings, receipt] = await Promise.all([getPaymentSettings(session, branch), getReceiptSettings(session, branch)]);
  return (
    <>
      <PageHeader kicker={branch} title="ตั้งค่าการชำระเงิน" />
      {options.length > 1 && (
        <nav aria-label="เลือกสาขา" className="flex flex-wrap gap-2">
          {options.map(option => (
            <Link key={option} href={`/payment-settings?branch=${encodeURIComponent(option)}`} aria-current={option === branch ? 'page' : undefined} className={`tap rounded-full border px-4 py-2 text-sm font-medium ${option === branch ? 'border-lime bg-lime/10 text-lime' : 'border-line bg-surface text-muted hover:text-text'}`}>
              {option}
            </Link>
          ))}
        </nav>
      )}
      <Card title="ช่องทางรับชำระ" subtitle="การตั้งค่านี้ใช้กับผู้ใช้ทุกคนในสาขานี้">
        <PaymentSettingsForm key={branch} setup={settings} hasPromptPayQr={settings.hasPromptPayQr} branch={branch} action={savePaymentSettingsAction} />
      </Card>
      <Card title="ใบเสร็จ" subtitle="หัวใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ และเลขที่ใบเสร็จของสาขานี้">
        <ReceiptSettingsForm key={branch} branch={branch} saved={receipt.saved} defaults={receipt.defaults} numberFormat={receipt.numberFormat} defaultNumberFormat={receipt.defaultNumberFormat} lastNumber={receipt.lastNumber} nextNumber={receipt.nextNumber} today={today()} action={saveReceiptSettingsAction} />
      </Card>
    </>
  );
}
