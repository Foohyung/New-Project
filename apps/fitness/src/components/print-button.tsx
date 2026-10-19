'use client';

import { Printer } from 'lucide-react';
import { btn } from './ui';

export function PrintButton({ label = 'พิมพ์ใบเสร็จ' }: { label?: string }) {
  const print = () => {
    window.print();
  };
  return (
    <button type="button" onClick={print} className={`${btn.secondary} print:hidden`}>
      <Printer aria-hidden className="size-5" />
      {label}
    </button>
  );
}
