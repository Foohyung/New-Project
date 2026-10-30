import { Suspense, type ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

/** หน้าสาธารณะ (แบบ 5E Portal Mix) — หลังบ้าน agent อยู่ใต้ /agent และใช้ layout ของตัวเอง */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="min-h-16 bg-navy lg:min-h-24" />}>
        <SiteHeader />
      </Suspense>
      {children}
      <SiteFooter />
    </>
  );
}
