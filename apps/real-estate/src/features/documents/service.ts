/** คลังเอกสารของ agent (pure) — ประเภทเอกสาร การผูกกับข้อมูล และการตรวจไฟล์อัปโหลด (§10.7) */

export const DOC_CATEGORIES = ['deed', 'id-card', 'house-registration', 'signed-contract', 'power-of-attorney', 'receipt', 'photo', 'other'] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];
export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  deed: 'โฉนด / อช.2',
  'id-card': 'สำเนาบัตร',
  'house-registration': 'ทะเบียนบ้าน',
  'signed-contract': 'สัญญาที่เซ็นแล้ว',
  'power-of-attorney': 'หนังสือมอบอำนาจ',
  receipt: 'ใบเสร็จ / ใบกำกับ',
  photo: 'รูปถ่ายทรัพย์',
  other: 'อื่น ๆ',
};

export const LINK_TYPES = ['property', 'owner', 'client', 'contract'] as const;
export type LinkType = (typeof LINK_TYPES)[number];
export const LINK_TYPE_LABEL: Record<LinkType, string> = { property: 'ทรัพย์', owner: 'เจ้าของ', client: 'ลูกค้า', contract: 'สัญญา' };

export interface StoredDocument {
  id: string;
  name: string;
  category: DocCategory;
  linkType: LinkType;
  linkId: string;
  mime: AllowedMime;
  size: number;
  uploadedAt: string;
  /** วันหมดอายุ เช่น บัตรประชาชน หนังสือมอบอำนาจ สัญญา */
  expiresAt: string | null;
  agentId: string;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export type AllowedMime = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
export const EXTENSION: Record<AllowedMime, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** ตรวจชนิดไฟล์จากเนื้อไฟล์ (magic bytes) ไม่เชื่อนามสกุลหรือ Content-Type ที่ browser ส่งมา */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

export type UploadCheck = { ok: true; mime: AllowedMime } | { ok: false; reason: 'empty' | 'too-large' | 'type' };

export function checkUpload(bytes: Uint8Array): UploadCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty' };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, reason: 'too-large' };
  const mime = sniffMime(bytes);
  return mime ? { ok: true, mime } : { ok: false, reason: 'type' };
}

export const UPLOAD_REJECT: Record<Exclude<UploadCheck, { ok: true }>['reason'], string> = {
  empty: 'ไฟล์ว่างเปล่า เลือกไฟล์ใหม่',
  'too-large': 'ไฟล์ใหญ่เกิน 10 MB ลองสแกนเป็น PDF ความละเอียดต่ำลง',
  type: 'รับเฉพาะ PDF, JPG, PNG หรือ WebP',
};

/** ชื่อไฟล์ที่ปลอดภัยสำหรับแสดงและดาวน์โหลด — ตัดอักขระควบคุม/path และบังคับนามสกุลตามชนิดจริง */
export function safeFileName(name: string, mime: AllowedMime): string {
  const base = name.replace(/\.[^.]*$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'เอกสาร';
  return `${base}.${EXTENSION[mime]}`;
}

export type ExpiryState = 'expired' | 'soon' | 'ok' | 'none';

/** หมดอายุแล้ว / ใกล้หมด (ภายใน 30 วัน) */
export function expiryState(expiresAt: string | null, today: string): ExpiryState {
  if (!expiresAt) return 'none';
  if (expiresAt < today) return 'expired';
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 30);
  return expiresAt <= soon.toISOString().slice(0, 10) ? 'soon' : 'ok';
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
