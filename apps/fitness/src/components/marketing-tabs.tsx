import { BellRing, TicketPercent } from 'lucide-react';
import Link from 'next/link';

export function MarketingTabs({ current }: { current: 'reminders' | 'coupons' }) {
  const tabs = [
    { key: 'reminders', href: '/marketing', label: 'แจ้งเตือนต่ออายุ', icon: BellRing },
    { key: 'coupons', href: '/marketing/coupons', label: 'คูปอง & ชวนเพื่อน', icon: TicketPercent },
  ] as const;
  return (
    <nav aria-label="เมนูการตลาด" className="-mx-4 flex gap-2 scrollbar-none overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {tabs.map(({ key, href, label, icon: Icon }) => (
        <Link key={key} href={href} aria-current={current === key ? 'page' : undefined} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-4 font-medium text-muted aria-[current=page]:border-lime aria-[current=page]:bg-lime aria-[current=page]:text-bg">
          <Icon aria-hidden className="size-4" />{label}
        </Link>
      ))}
    </nav>
  );
}
