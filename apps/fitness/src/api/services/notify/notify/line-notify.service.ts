// แจ้งเตือนเข้า LINE OA (Messaging API push) — logic ล้วน ไม่ยิง API ไม่แตะฐานข้อมูล (ตัวส่งอยู่ที่ src/api/lib/notify/notify/line.ts)
import { roleLabel, type Role } from '@/api/services/auth/auth/auth.roles';
import { formatThaiDateTime } from '@/api/lib/utils/utils/utils.date';

export type AuthEvent = 'login' | 'logout';

export interface LineNotifyConfig {
  token: string;
  /** userId (U…) / groupId (C…) / roomId (R…) ที่จะส่งไป */
  to: string[];
  /** บทบาทที่แจ้ง · null = ทุกบทบาท */
  roles: string[] | null;
}

const LINE_ID = /^[UCR][0-9a-f]{32}$/;

/**
 * อ่านค่าจาก env — ไม่ตั้ง token หรือผู้รับ = ปิดแจ้งเตือน (null)
 * - LINE_CHANNEL_ACCESS_TOKEN: Channel access token (long-lived) ของ Messaging API
 * - LINE_NOTIFY_TO: userId/groupId คั่นด้วย , (id ที่รูปแบบไม่ถูกต้องถูกตัดทิ้ง)
 * - LINE_NOTIFY_ROLES: บทบาทที่แจ้ง คั่นด้วย , เช่น admin,owner,manager,front-desk,trainer (ไม่ตั้ง = ทุกบทบาท รวมสมาชิก)
 */
export function lineNotifyConfig(env: Record<string, string | undefined>): LineNotifyConfig | null {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const to = (env.LINE_NOTIFY_TO ?? '').split(',').map(s => s.trim()).filter(s => LINE_ID.test(s));
  if (!token || !to.length) return null;
  const roles = (env.LINE_NOTIFY_ROLES ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return { token, to: [...new Set(to)], roles: roles.length ? roles : null };
}

export function shouldNotify(config: LineNotifyConfig | null, role: Role): config is LineNotifyConfig {
  return Boolean(config && (!config.roles || config.roles.includes(role)));
}

/** event จาก webhook ของ LINE เฉพาะฟิลด์ที่ใช้ */
export interface LineWebhookEvent {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
  message?: { type?: string; text?: string };
}

/** คำที่พิมพ์แล้วบอทตอบ ID กลับ */
const ID_COMMANDS = new Set(['id', 'ไอดี', 'userid', 'groupid']);

/**
 * ตอบ ID สำหรับใส่ LINE_NOTIFY_TO — พิมพ์ "id" ในแชทกับบอท/ในกลุ่ม หรือเชิญบอทเข้ากลุ่ม (join) แล้วบอทตอบเอง
 * event อื่นไม่ตอบ (คืนรายการ replyToken + ข้อความ)
 */
export function idReplies(events: readonly LineWebhookEvent[]): { replyToken: string; text: string }[] {
  return events.flatMap(event => {
    if (!event.replyToken || !event.source) return [];
    const asked = event.type === 'message' && event.message?.type === 'text' && ID_COMMANDS.has((event.message.text ?? '').trim().toLowerCase());
    if (!asked && event.type !== 'join') return [];
    const { userId, groupId, roomId } = event.source;
    const target = groupId ?? roomId ?? userId;
    if (!target) return [];
    const kind = groupId ? 'group ID ของกลุ่มนี้' : roomId ? 'room ID ของห้องนี้' : 'user ID ของคุณ';
    const lines = [
      `${kind}:`,
      target,
      '',
      'ใส่ใน .env ของเว็บ: LINE_NOTIFY_TO=' + target,
      ...(groupId && userId ? ['', `user ID ของคุณ: ${userId}`] : []),
    ];
    return [{ replyToken: event.replyToken, text: lines.join('\n') }];
  });
}

/** ข้อความแจ้งเตือน (LINE จำกัด 5,000 ตัวอักษร) */
export function authEventText(
  event: AuthEvent,
  who: { name: string; role: Role; roleName?: string; branch: string },
  at: Date,
  origin: { ip: string | null; device: string | null },
): string {
  const lines = [
    event === 'login' ? '🟢 เข้าสู่ระบบ FitFlow' : '🔴 ออกจากระบบ FitFlow',
    `ผู้ใช้: ${who.name}`,
    `ตำแหน่ง: ${roleLabel(who.role, who.roleName)}`,
    `สาขา: ${who.branch}`,
    `เวลา: ${formatThaiDateTime(at)}`,
    ...(origin.ip ? [`IP: ${origin.ip}`] : []),
    ...(origin.device ? [`อุปกรณ์: ${origin.device}`] : []),
  ];
  return lines.join('\n').slice(0, 5000);
}

export function passwordResetRequestText(
  request: { name: string; login: string; branch: string },
  at: Date,
): string {
  return [
    '🔐 มีคำขอรีเซ็ตรหัสผ่านใหม่จากระบบ FitFlow',
    `ผู้ใช้: ${request.name}`,
    `บัญชี: ${request.login}`,
    `สาขา: ${request.branch}`,
    `เวลา: ${formatThaiDateTime(at)}`,
  ].join('\n').slice(0, 5000);
}
