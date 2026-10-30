import { z } from 'zod';
import { AREAS, PRICE_RANGES, PROPERTY_TYPES, PROVINCES, SIZE_RANGES, SORTS, TRANSIT_LINES, areaById, provinceLabel, typeLabel } from './catalog';
import type { Badge, HomeDto } from './types';

const ids = (list: readonly { id: string }[]) => list.map(x => x.id) as [string, ...string[]];
const flag = z.literal('1').optional().catch(undefined);

/** แปลง searchParams ของหน้า /search เป็นตัวกรองที่ปลอดภัย — ค่าที่ไม่รู้จักถูกทิ้ง */
export const SearchSchema = z.object({
  deal: z.enum(['sale', 'rent']).optional().catch(undefined),
  market: z.enum(['new', 'resale']).optional().catch(undefined),
  type: z.enum(ids(PROPERTY_TYPES)).optional().catch(undefined),
  prov: z.enum(ids(PROVINCES)).optional().catch(undefined),
  area: z.enum(ids(AREAS)).optional().catch(undefined),
  price: z.enum(['p1', 'p2', 'p3', 'p4']).optional().catch(undefined),
  size: z.enum(ids(SIZE_RANGES)).optional().catch(undefined),
  beds: z.coerce.number().int().min(0).max(10).optional().catch(undefined),
  baths: z.coerce.number().int().min(1).max(10).optional().catch(undefined),
  q: z.string().trim().max(60).transform(v => v || undefined).optional().catch(undefined),
  pet: flag,
  transit: flag,
  sort: z.enum(SORTS.map(s => s.id) as [string, ...string[]]).optional().catch(undefined),
});
export type SearchQuery = z.infer<typeof SearchSchema>;

/** ลำดับคีย์คงที่ เพื่อให้ URL เดียวกันได้ string เดียวกัน (แชร์/แคชได้) */
const KEYS = ['deal', 'market', 'type', 'prov', 'area', 'price', 'beds', 'baths', 'size', 'q', 'pet', 'transit', 'sort'] as const;

export function searchHref(query: Record<string, string | number | undefined>, patch: Record<string, string | number | undefined> = {}): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  for (const k of KEYS) {
    const v = merged[k];
    if (v !== undefined && v !== '' && !(k === 'sort' && v === 'latest')) params.set(k, String(v));
  }
  const s = params.toString();
  return `/search${s ? `?${s}` : ''}`;
}

export function filterHomes(homes: readonly HomeDto[], q: SearchQuery): HomeDto[] {
  const price = q.price ? PRICE_RANGES[q.deal ?? 'sale'].find(r => r.id === q.price) : undefined;
  const size = q.size ? SIZE_RANGES.find(r => r.id === q.size) : undefined;
  const kw = q.q?.toLowerCase();
  return homes.filter(h =>
    (!q.deal || h.listing === q.deal) &&
    (!q.market || h.market === q.market) &&
    (!q.type || h.type === q.type) &&
    (!q.prov || h.province === q.prov) &&
    (!q.area || h.area === q.area) &&
    (!price || (h.price >= price.min && h.price < price.max)) &&
    (!size || (h.areaSqm >= size.min && h.areaSqm < size.max)) &&
    (q.beds === undefined || h.bedrooms >= q.beds) &&
    (q.baths === undefined || h.bathrooms >= q.baths) &&
    (!q.pet || h.badges.includes('pet')) &&
    (!q.transit || h.transit !== null) &&
    (!kw || [h.title, h.location, h.transit ?? '', h.project?.name ?? ''].some(s => s.toLowerCase().includes(kw))),
  );
}

export function sortHomes(homes: readonly HomeDto[], sort: SearchQuery['sort']): HomeDto[] {
  const by: Record<string, (a: HomeDto, b: HomeDto) => number> = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    area: (a, b) => b.areaSqm - a.areaSqm,
    latest: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  };
  return [...homes].sort(by[sort ?? 'latest']);
}

/** หัวข้อหน้าผลการค้นหา เช่น "ขายคอนโด อารีย์ ใกล้รถไฟฟ้า" (ใช้เป็น h1 และ title) */
export function searchTitle(q: SearchQuery): string {
  const place = q.area ? areaById(q.area)?.label : q.prov ? provinceLabel(q.prov) : undefined;
  return [
    `${q.deal === 'rent' ? 'เช่า' : 'ขาย'}${q.type ? typeLabel(q.type) : 'อสังหาฯ'}`,
    q.market === 'new' ? 'โครงการใหม่ มือ 1' : q.market === 'resale' ? 'มือสอง' : undefined,
    place,
    q.q,
    q.transit ? 'ใกล้รถไฟฟ้า' : undefined,
  ].filter(Boolean).join(' ');
}

/** จำนวนตัวกรองที่ตั้งไว้ (ไม่นับ deal/sort) — ใช้แสดงบนปุ่ม "ตัวกรอง" */
export function activeFilterCount(q: SearchQuery): number {
  return (['market', 'type', 'prov', 'area', 'price', 'beds', 'baths', 'size', 'pet', 'transit'] as const).filter(k => q[k] !== undefined).length;
}

/** ราคาเฉลี่ยต่อ ตร.ม. (สตางค์) — เฉพาะประกาศขาย */
export function pricePerSqm(home: Pick<HomeDto, 'listing' | 'price' | 'areaSqm'>): number | null {
  return home.listing === 'sale' && home.areaSqm > 0 ? Math.round(home.price / home.areaSqm) : null;
}

/** "4.59 ล้าน" / "28K" สำหรับหมุดแผนที่และราคาเริ่มต้นโครงการ */
export function shortPrice(home: Pick<HomeDto, 'listing' | 'price'>): string {
  const baht = home.price / 100;
  if (home.listing === 'rent') return `฿${String(Math.round(baht / 100) / 10)}K`;
  return `฿${String(Math.round(baht / 10_000) / 100)}M`;
}

export const BADGE_LABEL: Record<Badge, string> = { hot: 'ยอดนิยม', verified: 'ตรวจสอบแล้ว', promo: 'มีโปรโมชัน', pet: 'เลี้ยงสัตว์ได้', spotlight: 'Spotlight' };

/** "อัปเดตวันนี้" / "อัปเดต 3 วันที่แล้ว" เทียบกับวันที่ปัจจุบัน */
export function updatedLabel(iso: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? 'อัปเดตวันนี้' : days === 1 ? 'อัปเดตเมื่อวาน' : `อัปเดต ${String(days)} วันที่แล้ว`;
}

export interface Suggestion {
  group: 'ทำเล' | 'โครงการ' | 'รถไฟฟ้า' | 'จังหวัด';
  label: string;
  hint: string;
  href: string;
}

/** คำแนะนำในช่องค้นหา (ทำเล / โครงการ / สถานี / จังหวัด) */
export function suggest(text: string, projects: readonly { name: string; location: string }[], deal: 'sale' | 'rent'): Suggestion[] {
  const kw = text.trim();
  if (!kw) return [];
  const out: Suggestion[] = [];
  const hit = (...s: string[]) => s.some(x => x.includes(kw));
  for (const a of AREAS) if (hit(a.label)) out.push({ group: 'ทำเล', label: a.label, hint: `${provinceLabel(a.province)} · ${a.count.toLocaleString('th-TH')} ประกาศ`, href: searchHref({ deal, prov: a.province, area: a.id }) });
  for (const p of projects) if (hit(p.name)) out.push({ group: 'โครงการ', label: p.name, hint: p.location, href: searchHref({ deal, q: p.name.split(' ')[0] }) });
  for (const l of TRANSIT_LINES) for (const s of l.stations) if (hit(s.name)) out.push({ group: 'รถไฟฟ้า', label: `สถานี${s.name}`, hint: l.label, href: searchHref({ deal, q: s.name, transit: '1' }) });
  for (const p of PROVINCES) if (hit(p.label)) out.push({ group: 'จังหวัด', label: p.label, hint: `${p.count.toLocaleString('th-TH')} ประกาศ`, href: searchHref({ deal, prov: p.id }) });
  return out.slice(0, 8);
}
