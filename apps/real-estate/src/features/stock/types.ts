/** ข้อมูลสต็อกทรัพย์ของหลังบ้าน agent — เงินเป็นสตางค์ วันที่เป็น YYYY-MM-DD (เวลาไทย) */

export const PROPERTY_TYPES = ['condo', 'house', 'townhouse', 'shophouse', 'land'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  condo: 'คอนโด',
  house: 'บ้านเดี่ยว',
  townhouse: 'ทาวน์โฮม',
  shophouse: 'อาคารพาณิชย์',
  land: 'ที่ดิน',
};

export const UNIT_STATUSES = ['available', 'reserved', 'negotiating', 'rented', 'sold'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];
export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  available: 'ว่าง',
  reserved: 'จอง',
  negotiating: 'ต่อรอง',
  rented: 'เช่าแล้ว',
  sold: 'ขายแล้ว',
};

/** ค่าคอมที่ตกลงกับเจ้าของ: เปอร์เซ็นต์ของราคาขาย (basis point: 300 = 3%), จำนวนเดือนของค่าเช่า หรือจำนวนเงินคงที่ (สตางค์) */
export type Commission = { kind: 'percent'; basisPoints: number } | { kind: 'months'; months: number } | { kind: 'fixed'; satang: number };

export interface Owner {
  id: string;
  name: string;
  kind: 'person' | 'company';
  phone: string;
  lineId: string;
  email: string;
  /** เลขบัตรประชาชน / ทะเบียนนิติบุคคล (Confidential) */
  taxId: string;
  address: string;
  /** ฝากขาย / ฝากเช่า / ทั้งสองแบบ */
  listing: 'sale' | 'rent' | 'both';
  status: 'active' | 'paused' | 'ended';
  note: string;
  agentId: string;
}

export const OWNER_STATUS_LABEL: Record<Owner['status'], string> = { active: 'กำลังฝาก', paused: 'พักไว้', ended: 'ยกเลิกแล้ว' };
export const OWNER_LISTING_LABEL: Record<Owner['listing'], string> = { sale: 'ฝากขาย', rent: 'ฝากเช่า', both: 'ฝากขาย/เช่า' };

export interface Property {
  id: string;
  code: string;
  name: string;
  type: PropertyType;
  location: string;
  province: string;
  /** เอกสารสิทธิ์ เช่น โฉนด 45871 / อช.2 */
  deed: string;
  agentId: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  /** เลขห้อง/ยูนิต หรือ "ทั้งหลัง" */
  label: string;
  bedrooms: number;
  areaSqm: number;
  landSqWah: number | null;
  ownerId: string;
  salePrice: number | null;
  rentPrice: number | null;
  status: UnitStatus;
  commission: Commission;
  exclusive: boolean;
  /** วันสิ้นสุดสัญญาเช่าปัจจุบัน (ถ้ามีผู้เช่า) */
  leaseEnd: string | null;
  note: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  address: string;
  interest: 'buy' | 'rent';
  agentId: string;
}

/** ยูนิตพร้อมทรัพย์และเจ้าของ สำหรับแสดงผลในตาราง/การ์ด */
export interface UnitRow extends Unit {
  property: Property;
  owner: Pick<Owner, 'id' | 'name'>;
}
