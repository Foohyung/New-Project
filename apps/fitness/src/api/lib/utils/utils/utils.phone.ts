/** เบอร์มือถือไทย 10 หลักขึ้นต้นด้วย 06, 08, 09 */
const MOBILE = /^0[689]\d{8}$/;

/** ตัดขีด ช่องว่าง และวงเล็บออกจากเบอร์โทร */
export function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

export function isThaiMobile(input: string): boolean {
  return MOBILE.test(normalizePhone(input));
}

/** แสดงเบอร์โทรรูปแบบ 08X-XXX-XXXX (§15.1) */
export function formatThaiMobile(input: string): string {
  const digits = normalizePhone(input);
  if (!MOBILE.test(digits)) return input;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
