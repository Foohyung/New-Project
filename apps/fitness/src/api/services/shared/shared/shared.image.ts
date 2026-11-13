/** ตรวจไฟล์รูปที่อัปโหลด (pure) — ดูชนิดจาก magic bytes ไม่เชื่อนามสกุลหรือ MIME ที่เบราว์เซอร์ส่งมา */

export const IMAGE_TYPES: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function detectedImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/** อ่านไฟล์รูปจากฟอร์ม → base64 · ไม่มีไฟล์ = null · ผิดชนิด/ใหญ่เกิน = error ภาษาไทย */
export async function readImageUpload(value: FormDataEntryValue | null, maxBytes: number): Promise<{ data: string; contentType: string } | { error: string } | null> {
  const file = value instanceof File && value.size > 0 ? value : null;
  if (!file) return null;
  if (file.size > maxBytes) return { error: `ไฟล์ต้องมีขนาดไม่เกิน ${String(Math.round(maxBytes / 1024 / 1024))} MB` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectedImageType(bytes);
  if (!contentType || !IMAGE_TYPES.has(file.type) || file.type !== contentType) return { error: 'รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP ที่ถูกต้อง' };
  return { data: Buffer.from(bytes).toString('base64'), contentType };
}
