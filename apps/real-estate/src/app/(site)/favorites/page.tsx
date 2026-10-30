import { Heart } from 'lucide-react';
import type { Metadata } from 'next';
import { FavoriteList } from '@/components/site/favorite-list';
import { searchHomes } from '@/server/dal/homes';

export const metadata: Metadata = { title: 'รายการโปรด', robots: { index: false } };

/** รายการโปรดเก็บในเครื่อง (localStorage) — server ส่งประกาศทั้งหมดไป แล้ว client เลือกเฉพาะที่บันทึกไว้ (ระยะที่ 1 มีประกาศไม่มาก) */
export default async function FavoritesPage() {
  const homes = await searchHomes({});
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-10 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy"><Heart aria-hidden className="size-6 text-fav" />รายการโปรด</h1>
      <p className="mb-4 text-sm text-muted">บันทึกไว้ในเครื่องนี้เท่านั้น — กดรูปหัวใจบนประกาศเพื่อเพิ่มหรือนำออก</p>
      <FavoriteList homes={homes} now={new Date()} />
    </main>
  );
}
