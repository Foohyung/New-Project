import { after } from 'next/server';
import { replyLineText, verifyLineSignature } from '@/api/lib/notify/notify/line';
import { idReplies, type LineWebhookEvent } from '@/api/services/notify/notify/line-notify.service';

/**
 * POST /api/line/webhook — Webhook URL ของ LINE OA (ตั้งใน LINE Developers → Messaging API)
 * ใช้หา ID ใส่ LINE_NOTIFY_TO: พิมพ์ "id" ในแชทกับบอทหรือในกลุ่ม / เชิญบอทเข้ากลุ่ม แล้วบอทตอบ ID กลับ
 * ต้องตั้ง LINE_CHANNEL_SECRET + LINE_CHANNEL_ACCESS_TOKEN · ไม่ตั้ง secret = ปิด (404)
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!secret || !token) return new Response(null, { status: 404 });

  const body = await request.text();
  if (!verifyLineSignature(body, request.headers.get('x-line-signature'), secret)) return new Response(null, { status: 401 });

  let events: LineWebhookEvent[] = [];
  try {
    const parsed = JSON.parse(body) as { events?: unknown };
    if (Array.isArray(parsed.events)) events = parsed.events as LineWebhookEvent[];
  } catch {
    return new Response(null, { status: 400 });
  }

  // ตอบ 200 ให้ LINE ทันที แล้วค่อยส่งข้อความตอบกลับ (ปุ่ม Verify ส่ง events ว่าง = ได้ 200)
  const replies = idReplies(events);
  if (replies.length) after(() => Promise.all(replies.map(r => replyLineText(token, r.replyToken, r.text))));
  return new Response(null, { status: 200 });
}
