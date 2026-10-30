import type { ArtPalette, PropertyType } from './types';

// ข้อมูลอ้างอิงของหน้าสาธารณะ (ประเภท จังหวัด ทำเล สายรถไฟฟ้า ช่วงราคา) — ใช้ได้ทั้ง server และ client

export const PROPERTY_TYPES: readonly { id: PropertyType; label: string }[] = [
  { id: 'condo', label: 'คอนโด' },
  { id: 'house', label: 'บ้านเดี่ยว' },
  { id: 'townhouse', label: 'ทาวน์โฮม' },
  { id: 'twin', label: 'บ้านแฝด' },
  { id: 'land', label: 'ที่ดิน' },
  { id: 'shophouse', label: 'อาคารพาณิชย์' },
  { id: 'apartment', label: 'อพาร์ตเมนต์' },
  { id: 'office', label: 'สำนักงาน' },
  { id: 'shop', label: 'ร้านค้า' },
  { id: 'warehouse', label: 'โกดัง / โรงงาน' },
];

export const PROVINCES: readonly { id: string; label: string; count: number }[] = [
  { id: 'bkk', label: 'กรุงเทพมหานคร', count: 18_420 },
  { id: 'non', label: 'นนทบุรี', count: 4105 },
  { id: 'pth', label: 'ปทุมธานี', count: 2870 },
  { id: 'spk', label: 'สมุทรปราการ', count: 3240 },
  { id: 'cnx', label: 'เชียงใหม่', count: 2315 },
  { id: 'cbi', label: 'ชลบุรี', count: 3960 },
  { id: 'hkt', label: 'ภูเก็ต', count: 1780 },
  { id: 'kkn', label: 'ขอนแก่น', count: 860 },
];

export interface Area {
  id: string;
  label: string;
  province: string;
  count: number;
  kind: PropertyType;
  palette: ArtPalette;
  /** ราคากลางคอนโด (บาท/ตร.ม.) และการเปลี่ยนแปลงจากเดือนก่อน (%) — ข้อมูลตัวอย่าง */
  medianSqm: number;
  trendPct: number;
}

export const AREAS: readonly Area[] = [
  { id: 'ari', label: 'อารีย์', province: 'bkk', count: 1240, kind: 'condo', palette: 'day', medianSqm: 125_000, trendPct: 6 },
  { id: 'thonglor', label: 'ทองหล่อ – เอกมัย', province: 'bkk', count: 2105, kind: 'condo', palette: 'dusk', medianSqm: 210_000, trendPct: 5.3 },
  { id: 'rama9', label: 'พระราม 9 – รัชดา', province: 'bkk', count: 1876, kind: 'condo', palette: 'night', medianSqm: 116_000, trendPct: 4.6 },
  { id: 'bangna', label: 'บางนา – ศรีนครินทร์', province: 'spk', count: 1530, kind: 'townhouse', palette: 'mint', medianSqm: 82_000, trendPct: 3.9 },
  { id: 'ratchaphruek', label: 'ราชพฤกษ์', province: 'non', count: 980, kind: 'house', palette: 'day', medianSqm: 64_000, trendPct: 3.2 },
  { id: 'nimman', label: 'นิมมานเหมินท์', province: 'cnx', count: 640, kind: 'house', palette: 'mint', medianSqm: 85_000, trendPct: 2.5 },
  { id: 'pattaya', label: 'พัทยา – จอมเทียน', province: 'cbi', count: 2230, kind: 'condo', palette: 'sea', medianSqm: 78_000, trendPct: 2.1 },
  { id: 'kathu', label: 'กะทู้ – ป่าตอง', province: 'hkt', count: 720, kind: 'house', palette: 'sea', medianSqm: 98_000, trendPct: 1.8 },
];

export interface TransitLine {
  id: string;
  label: string;
  /** ชื่อ CSS variable ของสีสาย */
  color: string;
  stations: readonly { name: string; count: number }[];
}

export const TRANSIT_LINES: readonly TransitLine[] = [
  { id: 'bts-sukhumvit', label: 'BTS สายสุขุมวิท', color: 'var(--line-bts)', stations: [{ name: 'อารีย์', count: 120 }, { name: 'อโศก', count: 157 }, { name: 'ทองหล่อ', count: 194 }, { name: 'เอกมัย', count: 231 }, { name: 'อ่อนนุช', count: 268 }, { name: 'แบริ่ง', count: 305 }] },
  { id: 'bts-silom', label: 'BTS สายสีลม', color: 'var(--line-silom)', stations: [{ name: 'สนามกีฬา', count: 64 }, { name: 'ช่องนนทรี', count: 118 }, { name: 'สุรศักดิ์', count: 92 }, { name: 'วงเวียนใหญ่', count: 141 }] },
  { id: 'mrt-blue', label: 'MRT สายสีน้ำเงิน', color: 'var(--line-mrt)', stations: [{ name: 'พระราม 9', count: 210 }, { name: 'ห้วยขวาง', count: 176 }, { name: 'ลาดพร้าว', count: 188 }, { name: 'สามย่าน', count: 97 }] },
  { id: 'mrt-purple', label: 'MRT สายสีม่วง', color: 'var(--line-purple)', stations: [{ name: 'บางกระสอ', count: 85 }, { name: 'แยกนนทบุรี 1', count: 132 }, { name: 'บางพลู', count: 74 }] },
  { id: 'yellow', label: 'สายสีเหลือง', color: 'var(--line-yellow)', stations: [{ name: 'ศรีนครินทร์ 38', count: 66 }, { name: 'ศรีอุดม', count: 58 }, { name: 'ทิพวัล', count: 41 }] },
];

export interface Range {
  id: string;
  label: string;
  /** สตางค์ (ราคา) หรือ ตร.ม. (ขนาด) */
  min: number;
  max: number;
}

export const PRICE_RANGES: Record<'sale' | 'rent', readonly Range[]> = {
  sale: [
    { id: 'p1', label: 'ไม่เกิน 2 ล้าน', min: 0, max: 200_000_000 },
    { id: 'p2', label: '2 – 5 ล้าน', min: 200_000_000, max: 500_000_000 },
    { id: 'p3', label: '5 – 10 ล้าน', min: 500_000_000, max: 1_000_000_000 },
    { id: 'p4', label: '10 ล้านขึ้นไป', min: 1_000_000_000, max: Number.MAX_SAFE_INTEGER },
  ],
  rent: [
    { id: 'p1', label: 'ไม่เกิน ฿10,000/เดือน', min: 0, max: 1_000_000 },
    { id: 'p2', label: '฿10,000 – 20,000', min: 1_000_000, max: 2_000_000 },
    { id: 'p3', label: '฿20,000 – 40,000', min: 2_000_000, max: 4_000_000 },
    { id: 'p4', label: '฿40,000 ขึ้นไป', min: 4_000_000, max: Number.MAX_SAFE_INTEGER },
  ],
};

export const SIZE_RANGES: readonly Range[] = [
  { id: 's1', label: 'ไม่เกิน 35 ตร.ม.', min: 0, max: 35 },
  { id: 's2', label: '35 – 80 ตร.ม.', min: 35, max: 80 },
  { id: 's3', label: '80 – 200 ตร.ม.', min: 80, max: 200 },
  { id: 's4', label: '200 ตร.ม. ขึ้นไป', min: 200, max: Number.MAX_SAFE_INTEGER },
];

export const SORTS = [
  { id: 'latest', label: 'ล่าสุด / แนะนำ' },
  { id: 'price-asc', label: 'ราคาต่ำ → สูง' },
  { id: 'price-desc', label: 'ราคาสูง → ต่ำ' },
  { id: 'area', label: 'พื้นที่มากสุด' },
] as const;
export type SortId = (typeof SORTS)[number]['id'];

/** ลิงก์ไดเรกทอรีท้ายหน้า (SEO) และเมนู "ค้นหาด่วน" */
export const DIRECTORY: readonly { title: string; base: Record<string, string>; places: readonly string[] }[] = [
  { title: 'ขายคอนโดกรุงเทพฯ', base: { deal: 'sale', type: 'condo', prov: 'bkk' }, places: ['อารีย์', 'ทองหล่อ', 'พระราม 9', 'อ่อนนุช', 'สาทร', 'ลาดพร้าว'] },
  { title: 'เช่าคอนโดกรุงเทพฯ', base: { deal: 'rent', type: 'condo', prov: 'bkk' }, places: ['อโศก', 'เอกมัย', 'ห้วยขวาง', 'จตุจักร', 'บางนา', 'สีลม'] },
  { title: 'ขายบ้านเดี่ยว', base: { deal: 'sale', type: 'house' }, places: ['นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'เชียงใหม่', 'ชลบุรี', 'ภูเก็ต'] },
  { title: 'ขายที่ดิน / อาคารพาณิชย์', base: { deal: 'sale' }, places: ['หางดง', 'บางใหญ่', 'รังสิต', 'ลาดพร้าว', 'ศรีนครินทร์', 'หัวหิน'] },
];

export const typeLabel = (id: string) => PROPERTY_TYPES.find(t => t.id === id)?.label ?? '';
export const provinceLabel = (id: string) => PROVINCES.find(p => p.id === id)?.label ?? '';
export const areaById = (id: string) => AREAS.find(a => a.id === id);
