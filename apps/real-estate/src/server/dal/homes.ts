import 'server-only';
import { filterHomes, type HomeFilter } from '@/features/homes/service';
import type { HomeDto, NeighborhoodDto } from '@/features/homes/types';
import { homes, leads, neighborhoods } from '../seed';

// หน้าสาธารณะ: ข้อมูลประกาศเป็นระดับ Public (§11.1) ไม่ต้องตรวจ session

export function listHomes(filter: HomeFilter): Promise<HomeDto[]> {
  return Promise.resolve(filterHomes(homes, filter).sort((a, b) => b.match - a.match));
}

export function getHome(slug: string): Promise<HomeDto | null> {
  return Promise.resolve(homes.find(h => h.slug === slug) ?? null);
}

export function allHomeSlugs(): Promise<string[]> {
  return Promise.resolve(homes.map(h => h.slug));
}

export function listNeighborhoods(): Promise<NeighborhoodDto[]> {
  return Promise.resolve(neighborhoods);
}

/** บันทึก lead (Confidential) — ไม่คืนข้อมูลกลับไปหน้าเว็บ */
export function saveLead(lead: { homeSlug: string; name: string; phone: string; message: string }, at: Date): Promise<void> {
  leads.push({ ...lead, consentAt: at.toISOString() });
  return Promise.resolve();
}
