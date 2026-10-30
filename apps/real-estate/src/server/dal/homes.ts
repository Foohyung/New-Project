import 'server-only';
import { filterHomes, sortHomes, type SearchQuery } from '@/features/homes/service';
import type { AgentDto, HomeDto } from '@/features/homes/types';
import { agents, homes, leads } from '../seed';

// หน้าสาธารณะ: ข้อมูลประกาศเป็นระดับ Public (§11.1) ไม่ต้องตรวจ session

export function searchHomes(query: SearchQuery): Promise<HomeDto[]> {
  return Promise.resolve(sortHomes(filterHomes(homes, query), query.sort));
}

export function getHome(slug: string): Promise<HomeDto | null> {
  return Promise.resolve(homes.find(h => h.slug === slug) ?? null);
}

export function allHomeSlugs(): Promise<string[]> {
  return Promise.resolve(homes.map(h => h.slug));
}

/** ประกาศใกล้เคียง: จังหวัดเดียวกันก่อน แล้วตามด้วยประเภทเดียวกัน */
export function similarHomes(home: HomeDto, limit = 4): Promise<HomeDto[]> {
  const others = homes.filter(h => h.slug !== home.slug);
  const ranked = [...others.filter(h => h.province === home.province), ...others.filter(h => h.province !== home.province && h.type === home.type)];
  return Promise.resolve(ranked.slice(0, limit));
}

export function listAgents(): Promise<AgentDto[]> {
  return Promise.resolve(agents);
}

/** บันทึก lead (Confidential) — ไม่คืนข้อมูลกลับไปหน้าเว็บ */
export function saveLead(lead: { homeSlug: string; name: string; phone: string; message: string }, at: Date): Promise<void> {
  leads.push({ ...lead, consentAt: at.toISOString() });
  return Promise.resolve();
}
