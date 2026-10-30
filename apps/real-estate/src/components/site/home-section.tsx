import Link from 'next/link';
import type { ReactNode } from 'react';

/** ส่วนของหน้าแรก: หัวข้อสีกรมท่า + ลิงก์ "ดูทั้งหมด" (ถ้ามี title) หรือให้ลูกจัดหัวข้อเอง (เช่น Scroller) */
export function HomeSection({ id, title, description, more, children }: { id: string; title?: string; description?: string; more?: { href: string; label: string }; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="pt-7 md:pt-10">
      {title && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            <h2 id={`${id}-h`} className="text-xl font-semibold text-navy md:text-2xl">{title}</h2>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {more && <Link href={more.href} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-sm font-medium text-accent underline underline-offset-4">{more.label}</Link>}
        </div>
      )}
      {children}
    </section>
  );
}
