// เข้ารหัส token ของแพลตฟอร์ม (AES-256-GCM) · token สุ่ม · PKCE · เทียบรหัสผ่านแบบ constant-time
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function keyFrom(b64) {
  const k = Buffer.from(b64 ?? '', 'base64');
  if (k.length !== 32) throw new Error('TOKEN_ENC_KEY ต้องเป็น base64 ของ 32 ไบต์ — สร้างด้วย: openssl rand -base64 32');
  return k;
}

/** คืน "iv.tag.ciphertext" (base64) */
export function encrypt(key, value) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}

export function decrypt(key, blob) {
  const [iv, tag, enc] = String(blob).split('.').map(x => Buffer.from(x, 'base64'));
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
}

/** PKCE (S256) สำหรับ OAuth ของ X */
export function pkce() {
  const verifier = randomToken(48);
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}
