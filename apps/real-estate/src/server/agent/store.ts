import 'server-only';
import type { ContractFields, ContractType } from '@/features/contracts/template';
import type { StoredDocument } from '@/features/documents/service';
import type { LedgerEntry } from '@/features/ledger/service';
import type { Client, Owner, Property, Unit } from '@/features/stock/types';

/*
 * ที่เก็บข้อมูลหลังบ้าน (mock ระยะที่ 1 อยู่ในหน่วยความจำ — ระยะที่ 2 ย้ายไป PostgreSQL + Prisma)
 * ข้อมูลเจ้าของ/ลูกค้าทั้งหมดเป็นข้อมูลสมมติ · เงินเป็นสตางค์
 */

export interface ContractRecord {
  id: string;
  number: string;
  type: ContractType;
  unitId: string;
  clientId: string | null;
  fields: ContractFields;
  createdAt: string;
  agentId: string;
}

export interface Store {
  owners: Owner[];
  clients: Client[];
  properties: Property[];
  units: Unit[];
  contracts: ContractRecord[];
  documents: StoredDocument[];
  files: Map<string, Uint8Array>;
  ledger: LedgerEntry[];
  seq: number;
}

const B = (baht: number) => baht * 100;

/** ไฟล์ PDF ขนาดเล็กสำหรับเอกสารตัวอย่าง */
function samplePdf(title: string): Uint8Array {
  const body = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 60>>stream\nBT /F1 18 Tf 60 780 Td (${title.replace(/[()\\]/g, '')}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

export function seedStore(): Store {
  const owners: Owner[] = [
    { id: 'o1', name: 'นายสมศักดิ์ วงศ์ไพบูลย์', kind: 'person', phone: '081-234-5678', lineId: 'somsak.w', email: 'somsak.w@example.com', taxId: '3-1012-00456-78-1', address: '88/12 ซอยอารีย์ 4 ถนนพหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400', listing: 'both', status: 'active', note: 'สะดวกโทรหลัง 18:00 น.', agentId: 'ag-1' },
    { id: 'o2', name: 'นางนภา ศรีสุข', kind: 'person', phone: '089-555-1290', lineId: 'napa.s', email: 'napa.s@example.com', taxId: '3-5099-00321-45-4', address: '19 หมู่ 3 ตำบลบางรักน้อย อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11000', listing: 'both', status: 'active', note: 'ขอรายงานจำนวนผู้เข้าชมทุกวันศุกร์', agentId: 'ag-1' },
    { id: 'o3', name: 'บริษัท ริเวอร์ไลฟ์ แอสเซท จำกัด', kind: 'company', phone: '02-118-4400', lineId: 'riverlife', email: 'leasing@riverlife.example', taxId: '0105559012341', address: '501 ถนนเจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500', listing: 'rent', status: 'active', note: 'ผู้มีอำนาจลงนาม: นายวิทยา ธนกิจ (ต้องแนบหนังสือมอบอำนาจ)', agentId: 'ag-2' },
    { id: 'o4', name: 'นายประเสริฐ ดอยคำ', kind: 'person', phone: '084-909-7788', lineId: '', email: '', taxId: '3-5001-00888-12-6', address: '120 หมู่ 5 ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่ 50230', listing: 'sale', status: 'paused', note: 'พักการขายถึงสิ้นปี รอแบ่งแปลง', agentId: 'ag-1' },
  ];
  const properties: Property[] = [
    { id: 'p1', code: 'BH-101', name: 'คอนโด เดอะ ไลน์ อารีย์', type: 'condo', location: 'ถนนพหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพมหานคร', province: 'กรุงเทพมหานคร', deed: 'หนังสือกรรมสิทธิ์ห้องชุด (อช.2) ทะเบียนอาคารชุดเลขที่ 12/2560', agentId: 'ag-1', createdAt: '2026-03-02' },
    { id: 'p2', code: 'BH-102', name: 'บ้านเดี่ยวมีสวน ราชพฤกษ์', type: 'house', location: 'ตำบลบางรักน้อย อำเภอเมืองนนทบุรี จังหวัดนนทบุรี', province: 'นนทบุรี', deed: 'โฉนดที่ดินเลขที่ 45871', agentId: 'ag-1', createdAt: '2026-09-02' },
    { id: 'p3', code: 'BH-103', name: 'ทาวน์โฮมรีโนเวท อารีย์', type: 'townhouse', location: 'ซอยอารีย์ 5 แขวงพญาไท เขตพญาไท กรุงเทพมหานคร', province: 'กรุงเทพมหานคร', deed: 'โฉนดที่ดินเลขที่ 10233', agentId: 'ag-1', createdAt: '2026-07-15' },
    { id: 'p4', code: 'BH-104', name: 'อาคารพาณิชย์ ริเวอร์ไลฟ์', type: 'shophouse', location: 'ถนนเจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพมหานคร', province: 'กรุงเทพมหานคร', deed: 'โฉนดที่ดินเลขที่ 7720–7723', agentId: 'ag-2', createdAt: '2026-06-01' },
    { id: 'p5', code: 'BH-105', name: 'ที่ดินเปล่า วิวดอย หางดง', type: 'land', location: 'ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่', province: 'เชียงใหม่', deed: 'โฉนดที่ดินเลขที่ 30915', agentId: 'ag-1', createdAt: '2026-05-20' },
  ];
  const pct = (bp: number) => ({ kind: 'percent' as const, basisPoints: bp });
  const months = (m: number) => ({ kind: 'months' as const, months: m });
  const units: Unit[] = [
    { id: 'u1', propertyId: 'p1', label: '12A01', bedrooms: 1, areaSqm: 35, landSqWah: null, ownerId: 'o1', salePrice: B(4_200_000), rentPrice: B(18_000), status: 'available', commission: pct(300), exclusive: false, leaseEnd: null, note: 'ขายพร้อมผู้เช่าได้' },
    { id: 'u2', propertyId: 'p1', label: '12A05', bedrooms: 2, areaSqm: 58, landSqWah: null, ownerId: 'o2', salePrice: null, rentPrice: B(32_000), status: 'rented', commission: months(1), exclusive: false, leaseEnd: '2027-03-31', note: '' },
    { id: 'u3', propertyId: 'p1', label: '18B02', bedrooms: 0, areaSqm: 28, landSqWah: null, ownerId: 'o1', salePrice: B(2_950_000), rentPrice: null, status: 'reserved', commission: pct(300), exclusive: false, leaseEnd: null, note: 'ลูกค้าวางมัดจำแล้ว รอทำสัญญา' },
    { id: 'u4', propertyId: 'p1', label: '21C10', bedrooms: 1, areaSqm: 33, landSqWah: null, ownerId: 'o2', salePrice: null, rentPrice: B(17_500), status: 'available', commission: months(1), exclusive: false, leaseEnd: null, note: '' },
    { id: 'u5', propertyId: 'p2', label: 'ทั้งหลัง', bedrooms: 3, areaSqm: 180, landSqWah: 62, ownerId: 'o2', salePrice: B(7_900_000), rentPrice: null, status: 'available', commission: pct(300), exclusive: true, leaseEnd: null, note: '' },
    { id: 'u6', propertyId: 'p3', label: 'ทั้งหลัง', bedrooms: 3, areaSqm: 165, landSqWah: 22, ownerId: 'o1', salePrice: B(7_950_000), rentPrice: null, status: 'negotiating', commission: pct(300), exclusive: false, leaseEnd: null, note: 'ลูกค้าเสนอ 7.8 ล้าน' },
    { id: 'u7', propertyId: 'p4', label: 'A1', bedrooms: 0, areaSqm: 240, landSqWah: 16, ownerId: 'o3', salePrice: null, rentPrice: B(45_000), status: 'rented', commission: months(1), exclusive: true, leaseEnd: '2026-12-15', note: '' },
    { id: 'u8', propertyId: 'p4', label: 'A2', bedrooms: 0, areaSqm: 240, landSqWah: 16, ownerId: 'o3', salePrice: null, rentPrice: B(45_000), status: 'available', commission: months(1), exclusive: true, leaseEnd: null, note: '' },
    { id: 'u9', propertyId: 'p4', label: 'A3', bedrooms: 0, areaSqm: 240, landSqWah: 16, ownerId: 'o3', salePrice: null, rentPrice: B(48_000), status: 'reserved', commission: months(1), exclusive: true, leaseEnd: null, note: '' },
    { id: 'u10', propertyId: 'p5', label: 'แปลงเดียว', bedrooms: 0, areaSqm: 800, landSqWah: 200, ownerId: 'o4', salePrice: B(3_200_000), rentPrice: null, status: 'available', commission: { kind: 'fixed', satang: B(100_000) }, exclusive: false, leaseEnd: null, note: '' },
  ];
  const clients: Client[] = [
    { id: 'c1', name: 'นายปิยะ มั่นคง', phone: '086-777-3021', idNumber: '1-1037-00234-56-8', address: '45/7 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900', interest: 'rent', agentId: 'ag-1' },
    { id: 'c2', name: 'นางสาวอรุณี แสงทอง', phone: '092-410-5588', idNumber: '3-1201-00987-65-2', address: '120 ถนนรัตนาธิเบศร์ ตำบลบางกระสอ อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11000', interest: 'buy', agentId: 'ag-1' },
    { id: 'c3', name: 'Mr. Daniel Brooks', phone: '095-208-1144', idNumber: 'Passport 561234591', address: '9 ซอยสุขุมวิท 31 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110', interest: 'buy', agentId: 'ag-1' },
    { id: 'c4', name: 'บริษัท กาแฟดี จำกัด', phone: '02-555-0101', idNumber: '0105561000123', address: '77 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพมหานคร 10500', interest: 'rent', agentId: 'ag-2' },
  ];
  const contracts: ContractRecord[] = [
    { id: 'k1', number: 'BH-A-2569-001', type: 'agency', unitId: 'u5', clientId: null, fields: { place: 'สำนักงาน BaanHub สาขาพญาไท กรุงเทพมหานคร', signDate: '2026-09-03', purpose: 'ขาย', price: B(7_900_000), startDate: '2026-09-03', months: 6, commissionText: '3% ของราคาขาย', exclusive: true }, createdAt: '2026-09-03', agentId: 'ag-1' },
    { id: 'k2', number: 'BH-L-2569-002', type: 'lease', unitId: 'u2', clientId: 'c1', fields: { place: 'สำนักงาน BaanHub สาขาพญาไท กรุงเทพมหานคร', signDate: '2026-03-25', startDate: '2026-04-01', months: 12, rent: B(32_000), payDay: 5, deposit: B(64_000), advance: B(32_000), purpose: 'ที่อยู่อาศัย' }, createdAt: '2026-03-25', agentId: 'ag-1' },
  ];
  const doc = (d: Omit<StoredDocument, 'mime' | 'size'>, title: string): StoredDocument => {
    const bytes = samplePdf(title);
    files.set(d.id, bytes);
    return { ...d, mime: 'application/pdf', size: bytes.byteLength };
  };
  const files = new Map<string, Uint8Array>();
  const documents: StoredDocument[] = [
    doc({ id: 'f1', name: 'โฉนด 45871 หน้า-หลัง.pdf', category: 'deed', linkType: 'property', linkId: 'p2', uploadedAt: '2026-09-02', expiresAt: null, agentId: 'ag-1' }, 'Deed 45871'),
    doc({ id: 'f2', name: 'สำเนาบัตร นางนภา.pdf', category: 'id-card', linkType: 'owner', linkId: 'o2', uploadedAt: '2026-09-02', expiresAt: '2026-11-15', agentId: 'ag-1' }, 'ID card'),
    doc({ id: 'f3', name: 'สัญญาเช่า 12A05 เซ็นแล้ว.pdf', category: 'signed-contract', linkType: 'contract', linkId: 'k2', uploadedAt: '2026-03-25', expiresAt: '2027-03-31', agentId: 'ag-1' }, 'Lease 12A05'),
    doc({ id: 'f4', name: 'อช.2 ห้อง 18B02.pdf', category: 'deed', linkType: 'property', linkId: 'p1', uploadedAt: '2026-10-10', expiresAt: null, agentId: 'ag-1' }, 'Condo title'),
    doc({ id: 'f5', name: 'หนังสือมอบอำนาจ ริเวอร์ไลฟ์.pdf', category: 'power-of-attorney', linkType: 'owner', linkId: 'o3', uploadedAt: '2026-08-14', expiresAt: '2026-11-14', agentId: 'ag-2' }, 'Power of attorney'),
    doc({ id: 'f6', name: 'สำเนาบัตร นายปิยะ.pdf', category: 'id-card', linkType: 'client', linkId: 'c1', uploadedAt: '2026-03-20', expiresAt: '2031-05-02', agentId: 'ag-1' }, 'ID card client'),
    doc({ id: 'f7', name: 'สัญญาแต่งตั้งนายหน้า บ้านราชพฤกษ์ เซ็นแล้ว.pdf', category: 'signed-contract', linkType: 'contract', linkId: 'k1', uploadedAt: '2026-09-03', expiresAt: '2027-03-03', agentId: 'ag-1' }, 'Agency contract'),
    doc({ id: 'f8', name: 'ทะเบียนบ้าน นายสมศักดิ์.pdf', category: 'house-registration', linkType: 'owner', linkId: 'o1', uploadedAt: '2026-03-02', expiresAt: null, agentId: 'ag-1' }, 'House registration'),
  ];
  const L = (id: string, date: string, category: LedgerEntry['category'], description: string, amount: number, opts: Partial<LedgerEntry> = {}): LedgerEntry => {
    const income = category.startsWith('commission') || category === 'other-income';
    return { id, date, kind: income ? 'income' : 'expense', category, description, amount: B(amount), withholding: income && category !== 'other-income' ? Math.round(B(amount) * 3 / 100) : 0, status: 'settled', propertyId: null, agentId: 'ag-1', ...opts };
  };
  const ledger: LedgerEntry[] = [
    L('l1', '2026-05-12', 'commission-sale', 'ค่าคอมขายคอนโดศุภาลัย ห้อง 7/12', 75_000),
    L('l2', '2026-05-20', 'listing-fee', 'แพ็กเกจลงประกาศรายเดือน', 2_500),
    L('l3', '2026-06-08', 'commission-rent', 'ค่าคอมเช่าบ้าน นิมมานฯ', 28_000),
    L('l4', '2026-06-18', 'photo', 'ถ่ายภาพบ้านราชพฤกษ์', 3_500, { propertyId: 'p2' }),
    L('l5', '2026-07-03', 'commission-sale', 'ค่าคอมขายบ้านแฝด รังสิต', 113_700),
    L('l6', '2026-07-22', 'travel', 'พาลูกค้าชมที่ดิน เชียงใหม่', 4_200, { propertyId: 'p5' }),
    L('l7', '2026-08-15', 'commission-rent', 'ค่าคอมเช่าอาคาร A1 ริเวอร์ไลฟ์', 45_000, { propertyId: 'p4', agentId: 'ag-2' }),
    L('l8', '2026-08-28', 'advertising', 'โฆษณา Facebook ทรัพย์อารีย์', 6_000),
    L('l9', '2026-09-09', 'listing-fee', 'แพ็กเกจลงประกาศรายเดือน', 2_500),
    L('l10', '2026-09-25', 'commission-sale', 'ค่าคอมขายคอนโดลุมพินี ห้อง 3/08', 54_000),
    L('l11', '2026-10-05', 'commission-rent', 'ค่าคอมเช่า 12A05 (ต่อสัญญา)', 32_000, { propertyId: 'p1' }),
    L('l12', '2026-10-12', 'co-agent', 'แบ่งค่าคอม co-agent ดีล 12A05 (30%)', 9_600, { propertyId: 'p1' }),
    L('l13', '2026-10-19', 'travel', 'นัดชมทาวน์โฮม อารีย์', 850, { propertyId: 'p3' }),
    L('l14', '2026-10-30', 'commission-sale', 'ค่าคอมขาย 18B02 (รอวันโอน)', 88_500, { propertyId: 'p1', status: 'pending' }),
    L('l15', '2026-11-05', 'commission-rent', 'ค่าคอมเช่าอาคาร A3', 48_000, { propertyId: 'p4', status: 'pending', agentId: 'ag-2' }),
  ];
  return { owners, clients, properties, units, contracts, documents, files, ledger, seq: 100 };
}

const holder = globalThis as unknown as { __bhStore?: Store };

export function store(): Store {
  return (holder.__bhStore ??= seedStore());
}

/** ล้างข้อมูลกลับเป็นค่าตัวอย่าง (ใช้ใน test) */
export function resetStore(): void {
  holder.__bhStore = seedStore();
}

export function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}${String(s.seq)}`;
}
