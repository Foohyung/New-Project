import Link from 'next/link';
import { Printer } from 'lucide-react';

export function ReceiptPrintLink({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="พิมพ์ใบเสร็จ" title="พิมพ์ใบเสร็จ" className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-lime/10 hover:text-lime">
      <Printer aria-hidden className="size-5" />
    </Link>
  );
}
