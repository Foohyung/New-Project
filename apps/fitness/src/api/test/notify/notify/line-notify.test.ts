import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { authEventText, idReplies, lineNotifyConfig, passwordResetRequestText, shouldNotify } from '@/api/services/notify/notify/line-notify.service';
import { pushLineText, verifyLineSignature } from '@/api/lib/notify/notify/line';

const USER = `U${'a'.repeat(32)}`;
const GROUP = `C${'1'.repeat(32)}`;

describe('lineNotifyConfig', () => {
  it('ไม่ตั้ง token หรือผู้รับ = ปิดแจ้งเตือน', () => {
    expect(lineNotifyConfig({})).toBeNull();
    expect(lineNotifyConfig({ LINE_CHANNEL_ACCESS_TOKEN: 'tok' })).toBeNull();
    expect(lineNotifyConfig({ LINE_NOTIFY_TO: USER })).toBeNull();
  });
  it('อ่านผู้รับหลายคน ตัด id ผิดรูปแบบและซ้ำ', () => {
    const config = lineNotifyConfig({ LINE_CHANNEL_ACCESS_TOKEN: ' tok ', LINE_NOTIFY_TO: ` ${USER}, bad-id, ${GROUP}, ${USER}` });
    expect(config).toEqual({ token: 'tok', to: [USER, GROUP], roles: null });
  });
  it('LINE_NOTIFY_ROLES จำกัดบทบาทที่แจ้ง', () => {
    const config = lineNotifyConfig({ LINE_CHANNEL_ACCESS_TOKEN: 'tok', LINE_NOTIFY_TO: USER, LINE_NOTIFY_ROLES: 'owner, front-desk' });
    expect(shouldNotify(config, 'owner')).toBe(true);
    expect(shouldNotify(config, 'member')).toBe(false);
    expect(shouldNotify(lineNotifyConfig({ LINE_CHANNEL_ACCESS_TOKEN: 'tok', LINE_NOTIFY_TO: USER }), 'member')).toBe(true);
    expect(shouldNotify(null, 'owner')).toBe(false);
  });
});

describe('authEventText', () => {
  const who = { name: 'สมชาย ใจดี', role: 'front-desk', branch: 'สาขาสยาม' };
  const at = new Date('2026-11-08T11:42:00Z');

  it('ข้อความเข้าสู่ระบบ: ชื่อ ตำแหน่ง สาขา เวลาไทย IP อุปกรณ์', () => {
    const text = authEventText('login', who, at, { ip: '203.0.113.5', device: 'Chrome · Windows' });
    expect(text.split('\n')[0]).toContain('เข้าสู่ระบบ');
    expect(text).toContain('ผู้ใช้: สมชาย ใจดี');
    expect(text).toContain('ตำแหน่ง: เคาน์เตอร์');
    expect(text).toContain('สาขา: สาขาสยาม');
    expect(text).toContain('18:42');
    expect(text).toContain('IP: 203.0.113.5');
    expect(text).toContain('อุปกรณ์: Chrome · Windows');
  });
  it('ข้อความออกจากระบบ ไม่มี IP/อุปกรณ์ก็ได้ · ใช้ชื่อตำแหน่งที่ตั้งเอง', () => {
    const text = authEventText('logout', { ...who, roleName: 'แอดมินกะดึก' }, at, { ip: null, device: null });
    expect(text.split('\n')[0]).toContain('ออกจากระบบ');
    expect(text).toContain('ตำแหน่ง: แอดมินกะดึก');
    expect(text).not.toContain('IP:');
  });
});

describe('passwordResetRequestText', () => {
  it('แจ้งชื่อบัญชี สาขา และเวลาไทย', () => {
    const text = passwordResetRequestText(
      { name: 'สมชาย ใจดี', login: 'somchai@example.com', branch: 'สาขาสยาม' },
      new Date('2026-11-08T11:42:00Z'),
    );
    expect(text).toContain('คำขอรีเซ็ตรหัสผ่านใหม่');
    expect(text).toContain('ผู้ใช้: สมชาย ใจดี');
    expect(text).toContain('บัญชี: somchai@example.com');
    expect(text).toContain('สาขา: สาขาสยาม');
    expect(text).toContain('18:42');
  });
});

describe('idReplies', () => {
  it('พิมพ์ "id" ในแชทส่วนตัว → ตอบ user ID', () => {
    const replies = idReplies([{ type: 'message', replyToken: 'r1', source: { type: 'user', userId: USER }, message: { type: 'text', text: ' ID ' } }]);
    expect(replies).toHaveLength(1);
    expect(replies[0]?.replyToken).toBe('r1');
    expect(replies[0]?.text).toContain(`LINE_NOTIFY_TO=${USER}`);
    expect(replies[0]?.text).toContain('user ID ของคุณ');
  });
  it('เชิญบอทเข้ากลุ่ม (join) หรือพิมพ์ "ไอดี" ในกลุ่ม → ตอบ group ID', () => {
    const replies = idReplies([
      { type: 'join', replyToken: 'r1', source: { type: 'group', groupId: GROUP } },
      { type: 'message', replyToken: 'r2', source: { type: 'group', groupId: GROUP, userId: USER }, message: { type: 'text', text: 'ไอดี' } },
    ]);
    expect(replies).toHaveLength(2);
    expect(replies[0]?.text).toContain(`LINE_NOTIFY_TO=${GROUP}`);
    expect(replies[1]?.text).toContain(`user ID ของคุณ: ${USER}`);
  });
  it('ข้อความอื่น / ไม่มี replyToken / follow → ไม่ตอบ', () => {
    expect(idReplies([
      { type: 'message', replyToken: 'r1', source: { type: 'user', userId: USER }, message: { type: 'text', text: 'สวัสดี' } },
      { type: 'message', source: { type: 'user', userId: USER }, message: { type: 'text', text: 'id' } },
      { type: 'follow', replyToken: 'r3', source: { type: 'user', userId: USER } },
    ])).toEqual([]);
  });
});

describe('verifyLineSignature', () => {
  const body = '{"events":[]}';
  const sign = (secret: string) => createHmac('sha256', secret).update(body).digest('base64');

  it('ลายเซ็นถูก → true · ผิด/ไม่มี/secret อื่น → false', () => {
    expect(verifyLineSignature(body, sign('s3cret'), 's3cret')).toBe(true);
    expect(verifyLineSignature(body, sign('other'), 's3cret')).toBe(false);
    expect(verifyLineSignature(body, null, 's3cret')).toBe(false);
    expect(verifyLineSignature(body, 'not-base64!!', 's3cret')).toBe(false);
    expect(verifyLineSignature(`${body} `, sign('s3cret'), 's3cret')).toBe(false);
  });
});

describe('pushLineText', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('ยิง push API ทีละผู้รับด้วย Bearer token', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
    await pushLineText('tok', [USER, GROUP], 'สวัสดี');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.line.me/v2/bot/message/push');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({ to: USER, messages: [{ type: 'text', text: 'สวัสดี' }] });
  });
  it('LINE ตอบ error หรือเน็ตล่ม → log แต่ไม่โยน error (login/logout ต้องไม่พัง)', async () => {
    const log = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{"message":"Invalid token"}', { status: 401 }))
      .mockRejectedValueOnce(new Error('network down')));
    await expect(pushLineText('bad', [USER, GROUP], 'x')).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledTimes(2);
  });
});
