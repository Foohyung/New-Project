import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { after } from 'next/server';
import { headers } from 'next/headers';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { now } from '@/api/lib/clock/clock/clock';
import { clientIp, describeAgent } from '@/api/services/access/access/access.service';
import { authEventText, lineNotifyConfig, passwordResetRequestText, shouldNotify, type AuthEvent } from '@/api/services/notify/notify/line-notify.service';

const PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

/** ตรวจว่า webhook มาจาก LINE จริง: x-line-signature = base64(HMAC-SHA256(channel secret, body ดิบ)) */
export function verifyLineSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** ตอบกลับข้อความใน webhook (reply API ไม่นับโควตาข้อความ) */
export async function replyLineText(token: string, replyToken: string, text: string): Promise<void> {
  try {
    const res = await fetch(REPLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) logFailure(`reply HTTP ${String(res.status)} ${(await res.text()).slice(0, 300)}`);
  } catch (error) {
    logFailure(`reply ${error instanceof Error ? error.message : String(error)}`);
  }
}
const TIMEOUT_MS = 5_000;

/** เขียนลงหน้าต่าง pnpm start (stderr) ให้เห็นว่าทำไมไม่มีข้อความเข้า LINE — ไม่เก็บ token ลง log */
function logFailure(reason: string): void {
  process.stderr.write(`[line-notify] ส่งไม่สำเร็จ: ${reason}\n`);
}

/** ส่งข้อความเข้า LINE (Messaging API push) ทีละผู้รับ — ล้มเหลวแค่ log ไม่โยน error */
export async function pushLineText(token: string, to: readonly string[], text: string): Promise<void> {
  await Promise.all(to.map(async id => {
    try {
      const res = await fetch(PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: id, messages: [{ type: 'text', text }] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) logFailure(`HTTP ${String(res.status)} ${(await res.text()).slice(0, 300)}`);
    } catch (error) {
      logFailure(error instanceof Error ? error.message : String(error));
    }
  }));
}

/**
 * แจ้งเข้า LINE เมื่อมีคนเข้า/ออกจากระบบ — ส่งหลังตอบผู้ใช้แล้ว (after) จึงไม่ทำให้ login/logout ช้า
 * ไม่ตั้ง LINE_CHANNEL_ACCESS_TOKEN / LINE_NOTIFY_TO = ไม่ทำอะไร
 */
export async function notifyAuthEvent(event: AuthEvent, session: Session): Promise<void> {
  const config = lineNotifyConfig(process.env);
  if (!shouldNotify(config, session.role)) return;
  let origin: { ip: string | null; device: string | null } = { ip: null, device: null };
  try {
    const h = await headers();
    origin = { ip: clientIp(name => h.get(name)), device: describeAgent(h.get('user-agent') ?? '') };
  } catch { /* นอก request */ }
  const text = authEventText(event, session, now(), origin);
  after(() => pushLineText(config.token, config.to, text));
}

/** แจ้งผู้รับที่ตั้งค่าไว้เมื่อมีคำขอรีเซ็ตรหัสผ่านใหม่ โดยไม่ชะลอการตอบผู้ใช้ */
export function notifyPasswordResetRequest(request: { name: string; login: string; branch: string; requestedAt: Date }): void {
  const config = lineNotifyConfig(process.env);
  if (!config) return;
  const text = passwordResetRequestText(request, request.requestedAt);
  after(() => pushLineText(config.token, config.to, text));
}
