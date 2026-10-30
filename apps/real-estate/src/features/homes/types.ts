export type PropertyType = 'condo' | 'house' | 'townhouse' | 'twin' | 'land' | 'shophouse' | 'apartment' | 'office' | 'shop' | 'warehouse';
export type ArtPalette = 'day' | 'dusk' | 'night' | 'mint' | 'sea';
export type Badge = 'hot' | 'verified' | 'promo' | 'pet' | 'spotlight';

export interface AgentDto {
  name: string;
  initials: string;
  company: string;
  verified: boolean;
  /** เบอร์ติดต่อของ agent (ข้อมูลธุรกิจที่ agent ยินยอมเปิดเผยบนประกาศ) */
  phone: string;
  responseTime: string;
  rating: number;
  listings: number;
}

export interface ProjectDto {
  name: string;
  developer: string;
  units: number;
  floors: string;
  status: string;
  promo: string | null;
}

export interface HomeDto {
  slug: string;
  title: string;
  type: PropertyType;
  listing: 'sale' | 'rent';
  market: 'new' | 'resale';
  /** รหัสจังหวัด (ดู PROVINCES) */
  province: string;
  /** รหัสทำเล (ดู AREAS) หรือ null */
  area: string | null;
  location: string;
  transit: string | null;
  /** ราคาขาย หรือค่าเช่าต่อเดือน (สตางค์) */
  price: number;
  /** ราคานี้เป็น "ราคาเริ่มต้น" ของโครงการ */
  priceFrom: boolean;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  landSqWah: number | null;
  floor: string;
  photos: number;
  views: number;
  /** วันที่ (ISO) */
  createdAt: string;
  updatedAt: string;
  badges: Badge[];
  features: string[];
  description: string;
  project: ProjectDto | null;
  agent: AgentDto;
  palette: ArtPalette;
  /** ตำแหน่งบนแผนที่ประกอบ (เปอร์เซ็นต์ x, y) — ระยะที่ 2 ใช้พิกัดจริงจาก PostGIS */
  mapPos: [number, number];
}
