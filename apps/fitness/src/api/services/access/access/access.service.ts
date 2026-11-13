// IP และอุปกรณ์ของผู้ใช้ (audit_logs.ip / user_agent · หน้า /access-logs) — logic ล้วน ไม่แตะฐานข้อมูล

const LOOPBACK = /^(127\.|::1$|::ffff:127\.|localhost$)/;

/** ตัด port และวงเล็บ IPv6 ออก เช่น "1.2.3.4:5678" → "1.2.3.4", "[::1]:80" → "::1" */
function cleanIp(raw: string): string {
  const value = raw.trim().replace(/^"|"$/g, '');
  const bracket = /^\[([^\]]+)\]/.exec(value);
  if (bracket?.[1]) return bracket[1];
  return /^\d+\.\d+\.\d+\.\d+:\d+$/.test(value) ? value.slice(0, value.lastIndexOf(':')) : value;
}

/** ค่าใน header Forwarded (RFC 7239) เช่น for="[2001:db8::2]:443";proto=https, for=203.0.113.5 */
function forwardedFor(value: string): string[] {
  return [...value.matchAll(/for=("[^"]*"|[^;,\s]+)/gi)].map(m => cleanIp(m[1] ?? ''));
}

/** ค่าที่ไม่ใช่ IP จริง: ว่าง, unknown, ชื่อปิดบังแบบ _hidden ของ Forwarded */
const usable = (ip: string) => ip !== '' && ip.toLowerCase() !== 'unknown' && !ip.startsWith('_');

/**
 * IP ของผู้ใช้จาก header ของคำขอ (ส่งฟังก์ชันอ่าน header เข้ามา เช่น name => headers.get(name))
 * - X-Forwarded-For: IIS (ARR) และ Next.js ต่อ IP ของคนที่ต่อเข้ามาไว้ท้ายสุด ผู้ใช้ปลอมได้แค่ค่าหน้า ๆ
 *   จึงอ่านจากขวาไปซ้าย ข้าม IP ในเครื่อง (IIS → Node) แล้วเอาตัวแรกที่เจอ
 * - ไม่เจอ → ลอง Forwarded, X-Real-IP, X-Client-IP ตามลำดับ
 * - มีแต่ IP ในเครื่อง → คืน IP นั้น · ไม่มีเลย → "ไม่ทราบ"
 */
export function clientIp(header: (name: string) => string | null): string {
  const candidates = [
    (header('x-forwarded-for') ?? '').split(',').map(cleanIp).filter(usable).reverse(),
    forwardedFor(header('forwarded') ?? '').filter(usable).reverse(),
    [cleanIp(header('x-real-ip') ?? '')].filter(usable),
    [cleanIp(header('x-client-ip') ?? '')].filter(usable),
  ].flat();
  return candidates.find(ip => !LOOPBACK.test(ip)) ?? candidates[0] ?? 'ไม่ทราบ';
}

/** ชื่ออุปกรณ์/เบราว์เซอร์แบบย่อจาก User-Agent */
export function describeAgent(ua: string): string {
  if (!ua) return 'ไม่ทราบ';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Line\//.test(ua) ? 'LINE' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /bot|crawl|spider|curl|wget|python/i.test(ua) ? 'บอต/สคริปต์' : '';
  return [browser, os].filter(Boolean).join(' · ') || ua.slice(0, 40);
}

/** IP ของเครื่องเซิร์ฟเวอร์เอง — เจอค่านี้แปลว่าเปิดเว็บจากตัวเซิร์ฟเวอร์ หรือ IIS ไม่ได้ส่ง IP จริงมา (X-Forwarded-For) */
export const isLoopbackIp = (ip: string): boolean => LOOPBACK.test(ip);
