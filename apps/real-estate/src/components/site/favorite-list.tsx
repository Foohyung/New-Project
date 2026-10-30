'use client';

import Link from 'next/link';
import type { HomeDto } from '@/features/homes/types';
import { useFavorites } from './favorites';
import { ListingCard } from './listing-card';

export function FavoriteList({ homes, now }: { homes: HomeDto[]; now: Date }) {
  const fav = useFavorites();
  const saved = homes.filter(h => fav.includes(h.slug));
  if (saved.length === 0) {
    return (
      <div className="grid justify-items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
        <p className="font-semibold">ยังไม่มีประกาศที่บันทึกไว้</p>
        <p className="text-muted">กดรูปหัวใจบนการ์ดประกาศเพื่อเก็บไว้ดูภายหลัง</p>
        <Link href="/search" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-white">ไปค้นหาประกาศ</Link>
      </div>
    );
  }
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{saved.map(h => <ListingCard key={h.slug} home={h} now={now} />)}</div>;
}
