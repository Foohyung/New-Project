import type { Lifestyle } from './service';

export type ArtType = 'house' | 'townhouse' | 'condo' | 'villa' | 'land';
export type ArtPalette = 'warm' | 'wood' | 'dusk';

export interface HomeDto {
  slug: string;
  title: string;
  location: string;
  province: string;
  listing: 'sale' | 'rent';
  /** ราคาขาย หรือค่าเช่าต่อเดือน (สตางค์) */
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  landSqWah: number | null;
  tags: Lifestyle[];
  match: number;
  art: ArtType;
  palette: ArtPalette;
  description: string;
  transit: string | null;
  agent: { name: string; initials: string; responseTime: string };
  isNew: boolean;
}

export interface NeighborhoodDto {
  name: string;
  province: string;
  score: number;
  metrics: { label: string; value: number }[];
  median: string;
}
