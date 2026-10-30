'use client';

import { Heart } from 'lucide-react';
import { useSyncExternalStore } from 'react';

// รายการโปรดเก็บในเครื่องผู้ใช้ (localStorage) — ไม่ต้อง login · ระยะที่ 2 ซิงก์กับบัญชีสมาชิก
const KEY = 'baanhub-fav';
const EVENT = 'baanhub-fav-change';

function read(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
let cache = '';
function snapshot(): string {
  const next = read().join(',');
  if (next !== cache) cache = next;
  return cache;
}
function subscribe(cb: () => void) {
  addEventListener(EVENT, cb);
  addEventListener('storage', cb);
  return () => {
    removeEventListener(EVENT, cb);
    removeEventListener('storage', cb);
  };
}

export function useFavorites(): string[] {
  const s = useSyncExternalStore(subscribe, snapshot, () => '');
  return s ? s.split(',') : [];
}

export function toggleFavorite(slug: string) {
  const cur = read();
  const next = cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียน storage ไม่ได้ — ปุ่มยังทำงานในหน้านี้ไม่ได้ แต่ไม่ทำให้หน้าพัง
  }
  dispatchEvent(new Event(EVENT));
}

/** ปุ่มหัวใจบนการ์ด/หน้ารายละเอียด */
export function FavoriteButton({ slug, title, className = '' }: { slug: string; title: string; className?: string }) {
  const on = useFavorites().includes(slug);
  return (
    <button type="button" aria-pressed={on} aria-label={`บันทึก ${title} ไว้ในรายการโปรด`} onClick={e => { e.preventDefault(); toggleFavorite(slug); }} className={`z-10 grid size-11 place-items-center ${className}`}>
      <span className="grid size-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm">
        <Heart aria-hidden className={`size-[17px] ${on ? 'fill-fav text-fav' : ''}`} />
      </span>
    </button>
  );
}

export function FavoriteCount() {
  const n = useFavorites().length;
  return n > 0 ? <span className="absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-fav px-1 text-[11px] font-bold text-white">{n}</span> : null;
}
