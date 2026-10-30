import 'server-only';
import type { AgentDto, HomeDto } from '@/features/homes/types';

// ข้อมูลตัวอย่างระยะที่ 1 (ประกาศ โครงการ และ agent เป็นข้อมูลสมมติ) — ระยะที่ 2 ย้ายไป PostgreSQL + PostGIS

const agentA: AgentDto = { name: 'กฤษดา พรหมวงศ์', initials: 'กฤ', company: 'BaanHub Partner', verified: true, phone: '081-234-5678', responseTime: 'ตอบกลับภายใน 1 ชม.', rating: 5, listings: 42 };
const agentB: AgentDto = { name: 'ธนา โฮม', initials: 'ธน', company: 'ธนา โฮม เอเจนซี่', verified: true, phone: '089-765-4321', responseTime: 'ตอบกลับภายใน 1 ชม.', rating: 4.9, listings: 28 };
const agentC: AgentDto = { name: 'มาลี เอสเตท', initials: 'มล', company: 'มาลี เอสเตท', verified: false, phone: '086-555-0199', responseTime: 'ตอบกลับภายใน 3 ชม.', rating: 4.8, listings: 15 };
const agentD: AgentDto = { name: 'ฝ่ายขายโครงการ', initials: 'ขย', company: 'ผู้พัฒนาโครงการ', verified: true, phone: '02-123-4567', responseTime: 'ตอบกลับภายใน 30 นาที', rating: 5, listings: 6 };

export const agents = [agentA, agentB, agentC, agentD];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

type Seed = Omit<HomeDto, 'createdAt' | 'updatedAt' | 'priceFrom' | 'project' | 'landSqWah'> & Partial<Pick<HomeDto, 'priceFrom' | 'project' | 'landSqWah'>> & { days: number };
const make = ({ days, ...h }: Seed): HomeDto => ({ priceFrom: false, project: null, landSqWah: null, ...h, createdAt: daysAgo(days + 30), updatedAt: daysAgo(days) });

export const homes: HomeDto[] = [
  make({
    slug: 'condo-ari-skyview', title: 'คอนโดวิวเมือง ใกล้ BTS อารีย์', type: 'condo', listing: 'sale', market: 'resale', province: 'bkk', area: 'ari', location: 'พญาไท, กรุงเทพฯ', transit: 'BTS อารีย์ 350 ม.',
    price: 459_000_000, bedrooms: 1, bathrooms: 1, areaSqm: 38, floor: 'ชั้น 18', photos: 14, views: 972, days: 1, badges: ['hot', 'spotlight'], palette: 'day', mapPos: [38, 30], agent: agentA,
    features: ['เฟอร์นิเจอร์ครบ', 'สระว่ายน้ำ', 'ฟิตเนส', 'ที่จอดรถ', 'รปภ. 24 ชม.'],
    description: 'ห้องมุมชั้นสูง วิวเมืองไม่บล็อก ตกแต่งพร้อมเข้าอยู่ เดินถึงสถานีรถไฟฟ้า ใกล้ตลาดและคาเฟ่ย่านอารีย์',
  }),
  make({
    slug: 'townhouse-ari-renovated', title: 'ทาวน์โฮมรีโนเวท 3 ชั้น ซอยอารีย์', type: 'townhouse', listing: 'sale', market: 'resale', province: 'bkk', area: 'ari', location: 'พญาไท, กรุงเทพฯ', transit: 'BTS อารีย์ 900 ม.',
    price: 795_000_000, bedrooms: 3, bathrooms: 3, areaSqm: 165, landSqWah: 22, floor: '3 ชั้น', photos: 22, views: 1840, days: 3, badges: ['verified', 'spotlight'], palette: 'dusk', mapPos: [32, 38], agent: agentB,
    features: ['รีโนเวทใหม่', 'ห้องทำงาน', 'จอดรถ 1 คัน', 'ใกล้ตลาด'],
    description: 'ทาวน์โฮม 3 ชั้นรีโนเวทใหม่ทั้งหลัง มีห้องทำงานแยกชั้น 3 เดินถึงตลาดและร้านอาหาร',
  }),
  make({
    slug: 'the-verve-rama9', title: 'The Verve พระราม 9 — โครงการใหม่ติด MRT', type: 'condo', listing: 'sale', market: 'new', province: 'bkk', area: 'rama9', location: 'ห้วยขวาง, กรุงเทพฯ', transit: 'MRT พระราม 9 200 ม.',
    price: 289_000_000, priceFrom: true, bedrooms: 1, bathrooms: 1, areaSqm: 28, floor: '45 ชั้น', photos: 30, views: 4490, days: 0, badges: ['promo', 'spotlight'], palette: 'night', mapPos: [62, 44], agent: agentD,
    project: { name: 'The Verve พระราม 9', developer: 'สมมติ ดีเวลลอปเมนท์', units: 612, floors: '45', status: 'พร้อมอยู่ ไตรมาส 2/2570', promo: 'ฟรีค่าโอน + เฟอร์นิเจอร์' },
    features: ['Sky pool ชั้น 45', 'Co-working', 'EV charger', 'ห้องพัสดุอัจฉริยะ'],
    description: 'คอนโด high-rise ใจกลางย่านธุรกิจใหม่ ห้องเพดานสูง 2.7 ม. ส่วนกลางกว่า 2,000 ตร.ม.',
  }),
  make({
    slug: 'condo-thonglor-pet', title: 'คอนโดเลี้ยงสัตว์ได้ ทองหล่อ', type: 'condo', listing: 'rent', market: 'resale', province: 'bkk', area: 'thonglor', location: 'วัฒนา, กรุงเทพฯ', transit: 'BTS ทองหล่อ 450 ม.',
    price: 3_200_000, bedrooms: 2, bathrooms: 2, areaSqm: 62, floor: 'ชั้น 12', photos: 16, views: 326, days: 2, badges: ['pet'], palette: 'dusk', mapPos: [70, 58], agent: agentA,
    features: ['เลี้ยงสัตว์ได้', 'ลานวิ่งสุนัข', 'เฟอร์นิเจอร์ครบ', 'เครื่องซักผ้า'],
    description: 'คอนโด pet-friendly มีลานวิ่งสุนัขบนดาดฟ้า ห้องมุมแสงดี สัญญาขั้นต่ำ 1 ปี',
  }),
  make({
    slug: 'house-garden-ratchaphruek', title: 'บ้านเดี่ยวมีสวน ราชพฤกษ์', type: 'house', listing: 'sale', market: 'resale', province: 'non', area: 'ratchaphruek', location: 'บางรักน้อย, นนทบุรี', transit: null,
    price: 790_000_000, bedrooms: 4, bathrooms: 3, areaSqm: 180, landSqWah: 62, floor: '2 ชั้น', photos: 25, views: 2350, days: 5, badges: ['verified'], palette: 'day', mapPos: [14, 22], agent: agentB,
    features: ['สวนหน้าบ้าน', 'จอดรถ 2 คัน', 'ใกล้โรงเรียนนานาชาติ', 'ห้องแม่บ้าน'],
    description: 'บ้านเดี่ยว 2 ชั้นในหมู่บ้านเงียบสงบ สวนหน้าบ้านกว้างพอให้เด็กและสัตว์เลี้ยงวิ่งเล่น ใกล้โรงเรียนนานาชาติ 5 นาที',
  }),
  make({
    slug: 'bloom-ville-bangna', title: 'Bloom Ville บางนา — บ้านเดี่ยวโครงการใหม่', type: 'house', listing: 'sale', market: 'new', province: 'spk', area: 'bangna', location: 'บางพลี, สมุทรปราการ', transit: 'สายสีเหลือง ศรีนครินทร์ 38 1.5 กม.',
    price: 539_000_000, priceFrom: true, bedrooms: 3, bathrooms: 3, areaSqm: 152, landSqWah: 50, floor: '2 ชั้น', photos: 28, views: 1210, days: 1, badges: ['promo'], palette: 'mint', mapPos: [82, 80], agent: agentD,
    project: { name: 'Bloom Ville บางนา', developer: 'สมมติ แลนด์', units: 186, floors: '2', status: 'พร้อมอยู่', promo: 'ส่วนลด ฿300,000' },
    features: ['คลับเฮาส์', 'สวนส่วนกลาง 3 ไร่', 'Smart home', 'รปภ. 24 ชม.'],
    description: 'บ้านเดี่ยวดีไซน์โมเดิร์น หน้ากว้าง 15 ม. ห้องนั่งเล่นเพดานสูงโปร่ง ใกล้เมกาบางนา',
  }),
  make({
    slug: 'twin-house-rangsit', title: 'บ้านแฝด ใกล้โรงเรียนและตลาด', type: 'twin', listing: 'sale', market: 'resale', province: 'pth', area: null, location: 'คลองหลวง, ปทุมธานี', transit: null,
    price: 379_000_000, bedrooms: 3, bathrooms: 2, areaSqm: 140, landSqWah: 38, floor: '2 ชั้น', photos: 12, views: 512, days: 8, badges: [], palette: 'day', mapPos: [22, 8], agent: agentC,
    features: ['พร้อมอยู่', 'ใกล้ตลาด', 'ใกล้โรงเรียน'],
    description: 'บ้านแฝดพร้อมอยู่ ใกล้โรงเรียนและตลาดสด เดินทางเข้าเมืองสะดวกผ่านถนนพหลโยธิน',
  }),
  make({
    slug: 'wooden-house-nimman', title: 'บ้านไม้ร่วมสมัย ใกล้นิมมานฯ', type: 'house', listing: 'rent', market: 'resale', province: 'cnx', area: 'nimman', location: 'สุเทพ, เชียงใหม่', transit: null,
    price: 2_800_000, bedrooms: 2, bathrooms: 2, areaSqm: 140, landSqWah: 80, floor: '2 ชั้น', photos: 18, views: 1650, days: 4, badges: ['pet'], palette: 'mint', mapPos: [8, 64], agent: agentC,
    features: ['สวนร่มรื่น', 'มุมทำงาน', 'วิวดอย', 'เลี้ยงสัตว์ได้'],
    description: 'บ้านไม้ 2 ชั้นในสวนร่มรื่น มีมุมทำงานติดหน้าต่างวิวดอยสุเทพ เหมาะกับคนทำงานรีโมต',
  }),
  make({
    slug: 'land-hang-dong', title: 'ที่ดินเปล่า วิวดอย หางดง 200 ตร.ว.', type: 'land', listing: 'sale', market: 'resale', province: 'cnx', area: null, location: 'หางดง, เชียงใหม่', transit: null,
    price: 320_000_000, bedrooms: 0, bathrooms: 0, areaSqm: 800, landSqWah: 200, floor: '-', photos: 8, views: 288, days: 12, badges: [], palette: 'mint', mapPos: [6, 86], agent: agentC,
    features: ['ถมแล้ว', 'น้ำไฟเข้าถึง', 'โฉนดพร้อมโอน'],
    description: 'ที่ดินถมแล้ว วิวดอยรอบด้าน น้ำไฟเข้าถึง เหมาะสร้างบ้านพักหรือโฮมสเตย์',
  }),
  make({
    slug: 'shophouse-ladprao', title: 'อาคารพาณิชย์ 4 ชั้น ติดถนนลาดพร้าว', type: 'shophouse', listing: 'sale', market: 'resale', province: 'bkk', area: null, location: 'จตุจักร, กรุงเทพฯ', transit: 'MRT ลาดพร้าว 600 ม.',
    price: 1_250_000_000, bedrooms: 3, bathrooms: 4, areaSqm: 280, landSqWah: 18, floor: '4 ชั้น', photos: 15, views: 3220, days: 6, badges: ['verified'], palette: 'night', mapPos: [50, 18], agent: agentB,
    features: ['ติดถนนใหญ่', 'ทำเลค้าขาย', 'ดาดฟ้า', 'จอดรถหน้าอาคาร'],
    description: 'อาคารพาณิชย์ 4 ชั้นติดถนน หน้ากว้าง 4.5 ม. เหมาะทำออฟฟิศหรือร้านค้า คนผ่านทั้งวัน',
  }),
  make({
    slug: 'condo-jomtien-sea', title: 'คอนโดวิวทะเล จอมเทียน', type: 'condo', listing: 'rent', market: 'resale', province: 'cbi', area: 'pattaya', location: 'บางละมุง, ชลบุรี', transit: null,
    price: 1_800_000, bedrooms: 1, bathrooms: 1, areaSqm: 42, floor: 'ชั้น 21', photos: 20, views: 2870, days: 2, badges: ['hot'], palette: 'sea', mapPos: [90, 92], agent: agentA,
    features: ['วิวทะเล', 'สระ Infinity', 'ใกล้ชายหาด 200 ม.'],
    description: 'ห้องวิวทะเลเต็มบาน ระเบียงกว้าง เดินถึงชายหาดจอมเทียน เช่ารายเดือนหรือรายปี',
  }),
  make({
    slug: 'apartment-silom', title: 'อพาร์ตเมนต์ทั้งตึก ใกล้ BTS ช่องนนทรี', type: 'apartment', listing: 'sale', market: 'resale', province: 'bkk', area: null, location: 'บางรัก, กรุงเทพฯ', transit: 'BTS ช่องนนทรี 700 ม.',
    price: 4_800_000_000, bedrooms: 24, bathrooms: 24, areaSqm: 1200, landSqWah: 80, floor: '6 ชั้น', photos: 19, views: 640, days: 9, badges: ['verified'], palette: 'day', mapPos: [48, 70], agent: agentA,
    features: ['ผู้เช่าเต็ม 92%', 'ลิฟต์', 'รายได้ ฿380,000/เดือน'],
    description: 'อพาร์ตเมนต์ 24 ห้อง ผู้เช่าเกือบเต็ม รายได้สม่ำเสมอ เหมาะกับนักลงทุนสายปล่อยเช่า',
  }),
];

/** lead จากฟอร์มติดต่อ — ระยะที่ 2 เก็บใน DB พร้อม consent log และ retention (§11.3) */
export const leads: { homeSlug: string; name: string; phone: string; message: string; consentAt: string }[] = [];
