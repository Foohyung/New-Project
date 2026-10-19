import { z } from 'zod';

export const LIFESTYLES = ['transit', 'pet', 'school', 'garden', 'work', 'market'] as const;
export type Lifestyle = (typeof LIFESTYLES)[number];

export const LIFESTYLE_LABEL: Record<Lifestyle, string> = {
  transit: '🚇 ใกล้รถไฟฟ้า',
  pet: '🐶 เลี้ยงสัตว์ได้',
  school: '🏫 ใกล้โรงเรียน',
  garden: '🌳 มีสวน',
  work: '💻 มีห้องทำงาน',
  market: '🛒 ใกล้ตลาด',
};

export interface HomeLike {
  title: string;
  location: string;
  /** สตางค์ */
  price: number;
  listing?: 'sale' | 'rent';
  tags: readonly Lifestyle[];
}

/** แปลง searchParams เป็นตัวกรองที่ปลอดภัย (ค่าที่ไม่รู้จักถูกทิ้ง) */
export const HomeFilterSchema = z.object({
  tags: z
    .string()
    .optional()
    .transform(v => (v ?? '').split(',').filter((t): t is Lifestyle => (LIFESTYLES as readonly string[]).includes(t)))
    .catch([]),
  q: z.string().trim().max(60).optional().catch(undefined),
  /** งบสูงสุด (บาท) */
  max: z.coerce.number().int().positive().max(1_000_000_000).optional().catch(undefined),
  listing: z.enum(['sale', 'rent']).optional().catch(undefined),
});
export type HomeFilter = z.infer<typeof HomeFilterSchema>;

export function filterHomes<T extends HomeLike>(homes: readonly T[], filter: HomeFilter): T[] {
  const q = filter.q?.toLowerCase();
  return homes.filter(
    h =>
      filter.tags.every(t => h.tags.includes(t)) &&
      (!q || h.title.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)) &&
      (!filter.max || h.price <= filter.max * 100) &&
      (!filter.listing || h.listing === filter.listing),
  );
}

/** สลับไลฟ์สไตล์ในรายการ แล้วคืนค่าเป็น query string `tags` */
export function toggleTag(current: readonly Lifestyle[], tag: Lifestyle): string {
  const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
  return LIFESTYLES.filter(t => next.includes(t)).join(',');
}
