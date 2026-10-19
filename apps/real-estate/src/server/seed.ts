import 'server-only';
import type { HomeDto, NeighborhoodDto } from '@/features/homes/types';

// ข้อมูลตัวอย่างระยะที่ 1 (ประกาศ คะแนนย่าน และ agent เป็นข้อมูลสมมติ) — ระยะที่ 2 ย้ายไป PostgreSQL + PostGIS

const agentA = { name: 'กฤษดา เอเจนต์', initials: 'กฤ', responseTime: 'ตอบกลับภายใน 1 ชม.' };
const agentB = { name: 'ธนา โฮม', initials: 'ธน', responseTime: 'ตอบกลับภายใน 1 ชม.' };
const agentC = { name: 'มาลี เอสเตท', initials: 'มล', responseTime: 'ตอบกลับภายใน 3 ชม.' };

export const homes: HomeDto[] = [
  {
    slug: 'house-garden-ratchaphruek', title: 'บ้านเดี่ยวมีสวน ราชพฤกษ์', location: 'บางรักน้อย, นนทบุรี', province: 'นนทบุรี', listing: 'sale',
    price: 790_000_000, bedrooms: 3, bathrooms: 3, areaSqm: 180, landSqWah: 62, tags: ['garden', 'pet', 'school'], match: 94, art: 'house', palette: 'warm',
    description: 'บ้านเดี่ยว 2 ชั้นในหมู่บ้านเงียบสงบ สวนหน้าบ้านกว้างพอให้เด็กและสัตว์เลี้ยงวิ่งเล่น ใกล้โรงเรียนนานาชาติ 5 นาที',
    transit: null, agent: agentB, isNew: false,
  },
  {
    slug: 'townhouse-ari-renovated', title: 'ทาวน์โฮมรีโนเวท ใกล้ BTS อารีย์', location: 'พญาไท, กรุงเทพฯ', province: 'กรุงเทพมหานคร', listing: 'sale',
    price: 795_000_000, bedrooms: 3, bathrooms: 3, areaSqm: 165, landSqWah: 22, tags: ['transit', 'work', 'market'], match: 88, art: 'townhouse', palette: 'dusk',
    description: 'ทาวน์โฮม 3 ชั้นรีโนเวทใหม่ทั้งหลัง มีห้องทำงานแยกชั้น 3 เดินถึงตลาดและคาเฟ่ย่านอารีย์',
    transit: 'BTS อารีย์ 900 ม.', agent: agentB, isNew: true,
  },
  {
    slug: 'condo-thonglor-pet-friendly', title: 'คอนโดเลี้ยงสัตว์ได้ ทองหล่อ', location: 'วัฒนา, กรุงเทพฯ', province: 'กรุงเทพมหานคร', listing: 'sale',
    price: 560_000_000, bedrooms: 1, bathrooms: 1, areaSqm: 45, landSqWah: null, tags: ['pet', 'transit'], match: 85, art: 'condo', palette: 'dusk',
    description: 'คอนโด pet-friendly มีลานวิ่งสุนัขบนดาดฟ้า ห้องมุมแสงดี ใกล้ BTS ทองหล่อ',
    transit: 'BTS ทองหล่อ 450 ม.', agent: agentA, isNew: false,
  },
  {
    slug: 'wooden-house-nimman-rent', title: 'บ้านไม้ร่วมสมัย ใกล้นิมมานฯ', location: 'สุเทพ, เชียงใหม่', province: 'เชียงใหม่', listing: 'rent',
    price: 2_800_000, bedrooms: 2, bathrooms: 2, areaSqm: 140, landSqWah: 80, tags: ['garden', 'work'], match: 83, art: 'house', palette: 'wood',
    description: 'บ้านไม้ 2 ชั้นในสวนร่มรื่น มีมุมทำงานติดหน้าต่างวิวดอยสุเทพ เหมาะกับคนทำงานรีโมต',
    transit: null, agent: agentC, isNew: false,
  },
  {
    slug: 'twin-house-rangsit', title: 'บ้านแฝด ใกล้โรงเรียนและตลาด', location: 'คลองหลวง, ปทุมธานี', province: 'ปทุมธานี', listing: 'sale',
    price: 379_000_000, bedrooms: 3, bathrooms: 2, areaSqm: 140, landSqWah: 38, tags: ['school', 'market', 'pet'], match: 79, art: 'townhouse', palette: 'warm',
    description: 'บ้านแฝดพร้อมอยู่ ใกล้โรงเรียนและตลาดสด เดินทางเข้าเมืองสะดวกผ่านถนนพหลโยธิน',
    transit: null, agent: agentC, isNew: false,
  },
  {
    slug: 'land-hang-dong', title: 'ที่ดินเปล่า วิวดอย หางดง', location: 'หางดง, เชียงใหม่', province: 'เชียงใหม่', listing: 'sale',
    price: 320_000_000, bedrooms: 0, bathrooms: 0, areaSqm: 800, landSqWah: 200, tags: ['garden'], match: 72, art: 'land', palette: 'wood',
    description: 'ที่ดินถมแล้ว วิวดอยรอบด้าน น้ำไฟเข้าถึง เหมาะสร้างบ้านพักหรือโฮมสเตย์',
    transit: null, agent: agentC, isNew: false,
  },
];

export const neighborhoods: NeighborhoodDto[] = [
  { name: 'อารีย์', province: 'กรุงเทพฯ', score: 8.7, metrics: [{ label: 'เดินได้', value: 9.1 }, { label: 'ร้านอาหาร', value: 9.4 }, { label: 'พื้นที่สีเขียว', value: 6.8 }, { label: 'การเดินทาง', value: 9.0 }], median: 'คอนโด ฿125,000/ตร.ม.' },
  { name: 'ราชพฤกษ์', province: 'นนทบุรี', score: 8.2, metrics: [{ label: 'เดินได้', value: 5.9 }, { label: 'ร้านอาหาร', value: 7.6 }, { label: 'พื้นที่สีเขียว', value: 8.8 }, { label: 'การเดินทาง', value: 7.2 }], median: 'บ้านเดี่ยว ฿7.5 ล้าน' },
  { name: 'นิมมานเหมินท์', province: 'เชียงใหม่', score: 8.5, metrics: [{ label: 'เดินได้', value: 8.6 }, { label: 'ร้านอาหาร', value: 9.5 }, { label: 'พื้นที่สีเขียว', value: 7.4 }, { label: 'การเดินทาง', value: 6.9 }], median: 'คอนโด ฿85,000/ตร.ม.' },
  { name: 'ทองหล่อ', province: 'กรุงเทพฯ', score: 8.4, metrics: [{ label: 'เดินได้', value: 8.8 }, { label: 'ร้านอาหาร', value: 9.7 }, { label: 'พื้นที่สีเขียว', value: 5.9 }, { label: 'การเดินทาง', value: 8.6 }], median: 'คอนโด ฿210,000/ตร.ม.' },
];

/** lead จากฟอร์มติดต่อ — ระยะที่ 2 เก็บใน DB พร้อม consent log และ retention (§11.3) */
export const leads: { homeSlug: string; name: string; phone: string; message: string; consentAt: string }[] = [];
