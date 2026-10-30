import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { decrypt, encrypt, keyFrom } from '../crypto.mjs';
import { line, meta, publishTo, tiktok, x } from '../connectors.mjs';
import { dueRuleRun } from '../scheduler.mjs';
import { initialState, mergeClientState } from '../store.mjs';

const KEY = keyFrom(randomBytes(32).toString('base64'));
const cfg = { meta: { appId: 'app', appSecret: 'sec', version: 'v21.0' }, x: { clientId: 'xid', clientSecret: 'xsec' }, tiktok: { clientKey: 'tk', clientSecret: 'ts' }, publicBaseUrl: 'https://social.example.com' };
const image = { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) };

/** fetch จำลอง: บันทึกทุกคำขอ แล้วตอบตามลำดับ */
function mockFetch(...responses) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = responses.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: r.headers ?? {} });
  };
  f.calls = calls;
  return f;
}

test('เข้ารหัส token แล้วถอดได้ · แก้ข้อมูลแล้วถอดไม่ได้', () => {
  const blob = encrypt(KEY, { token: 'abc' });
  assert.deepEqual(decrypt(KEY, blob), { token: 'abc' });
  const [iv, tag, enc] = blob.split('.');
  const bad = [iv, tag, Buffer.from(Buffer.from(enc, 'base64').map(b => b ^ 1)).toString('base64')].join('.');
  assert.throws(() => decrypt(KEY, bad));
  assert.throws(() => keyFrom('short'), /32 ไบต์/);
});

test('หน้าเว็บตั้งสถานะโพสต์แล้วเองไม่ได้ และแก้สถานะการเชื่อมบัญชีไม่ได้', () => {
  const server = initialState();
  server.workspaces[0].accounts.fb = { on: true, name: 'เพจจริง' };
  const merged = mergeClientState(server, {
    workspaces: [{ ...server.workspaces[0], name: 'ชื่อใหม่', accounts: { fb: { on: false }, x: { on: true, name: 'ปลอม' } } }],
    posts: [{ id: 'p1', ws: 'ws-main', at: '2026-10-23T10:00:00Z', platforms: ['fb', 'zz'], media: 'u:abcdefgh', caption: 'hi', status: 'posted' }],
  });
  assert.equal(merged.workspaces[0].name, 'ชื่อใหม่');
  assert.equal(merged.workspaces[0].accounts.fb.on, true);
  assert.equal(merged.workspaces[0].accounts.x.on, false);
  assert.equal(merged.posts[0].status, 'scheduled');
  assert.deepEqual(merged.posts[0].platforms, ['fb']);
});

test('โพสต์ที่เซิร์ฟเวอร์โพสต์แล้วคงผลไว้ · โพสต์ไม่สำเร็จสั่งลองใหม่ได้ · กำลังโพสต์ห้ามหาย', () => {
  const server = initialState();
  server.posts = [
    { id: 'done', ws: 'ws-main', status: 'posted', results: { fb: { ok: true } }, platforms: ['fb'], at: 'x', caption: 'a', media: 0 },
    { id: 'bad', ws: 'ws-main', status: 'failed', results: { fb: { ok: false } }, platforms: ['fb'], at: 'x', caption: 'b', media: 0 },
    { id: 'busy', ws: 'ws-main', status: 'publishing', platforms: ['fb'], at: 'x', caption: 'c', media: 0 },
  ];
  const merged = mergeClientState(server, { workspaces: server.workspaces, posts: [
    { id: 'done', ws: 'ws-main', status: 'draft', platforms: ['fb'], at: '2026-10-23T10:00:00Z', caption: 'แก้', media: 0 },
    { id: 'bad', ws: 'ws-main', status: 'scheduled', platforms: ['fb'], at: '2026-10-23T10:00:00Z', caption: 'ลองใหม่', media: 0 },
  ] });
  const byId = Object.fromEntries(merged.posts.map(p => [p.id, p]));
  assert.equal(byId.done.status, 'posted');
  assert.equal(byId.done.caption, 'a');
  assert.equal(byId.bad.status, 'scheduled');
  assert.equal(byId.busy.status, 'publishing');
});

test('กฎ: ถึงเวลาแล้วรันครั้งเดียว · ข้ามรอบได้ · พลาดนานเกินไม่โพสต์ย้อนหลัง', () => {
  const now = new Date(2026, 9, 23, 7, 5); // ศุกร์ 07:05
  const rule = { on: true, time: '07:00', days: [5], skip: [], lastRun: null };
  const due = dueRuleRun(rule, now);
  assert.equal(due?.getHours(), 7);
  assert.equal(dueRuleRun({ ...rule, lastRun: due.toISOString() }, now), null);
  assert.equal(dueRuleRun({ ...rule, skip: [due.toISOString()] }, now), null);
  assert.equal(dueRuleRun({ ...rule, days: [4] }, now), null);
  assert.equal(dueRuleRun(rule, new Date(2026, 9, 23, 6, 59)), null);
  assert.equal(dueRuleRun(rule, new Date(2026, 9, 23, 14, 0)), null);
  assert.equal(dueRuleRun({ ...rule, on: false }, now), null);
});

test('Facebook: ส่งไฟล์รูปขึ้น /{page}/photos พร้อม caption', async () => {
  const f = mockFetch({ body: { id: 'photo1', post_id: 'page_post1' } });
  const id = await meta.publishFb({ cfg, secret: { pageId: 'PAGE', token: 'PT' }, caption: 'สวัสดี', image, fetch: f });
  assert.equal(id, 'page_post1');
  assert.equal(f.calls[0].url, 'https://graph.facebook.com/v21.0/PAGE/photos');
  const body = f.calls[0].init.body;
  assert.equal(body.get('caption'), 'สวัสดี');
  assert.equal(body.get('access_token'), 'PT');
  assert.ok(body.get('source'));
});

test('Instagram: สร้าง container → รอ FINISHED → publish · ต้องเป็น https', async () => {
  const f = mockFetch({ body: { id: 'C1' } }, { body: { status_code: 'IN_PROGRESS' } }, { body: { status_code: 'FINISHED' } }, { body: { id: 'IGPOST' } });
  const id = await meta.publishIg({ cfg, secret: { igId: 'IG', token: 'PT' }, caption: 'cap', imageUrl: 'https://social.example.com/media/a.jpg', fetch: f, wait: async () => {} });
  assert.equal(id, 'IGPOST');
  assert.match(f.calls[0].url, /\/IG\/media$/);
  assert.match(String(f.calls[0].init.body), /image_url=https/);
  assert.match(f.calls[3].url, /\/IG\/media_publish$/);
  await assert.rejects(meta.publishIg({ cfg, secret: { igId: 'IG', token: 'PT' }, caption: 'c', imageUrl: 'http://localhost/a.jpg', fetch: mockFetch() }), /PUBLIC_BASE_URL/);
});

test('ข้อความ error ของแพลตฟอร์มส่งต่อให้ผู้ใช้อ่านได้', async () => {
  const f = mockFetch({ status: 400, body: { error: { message: '(#200) The user hasn\'t authorized the application to perform this action' } } });
  await assert.rejects(meta.publishFb({ cfg, secret: { pageId: 'P', token: 'T' }, caption: 'x', image, fetch: f }), /Facebook ปฏิเสธ \(400\).*authorized/);
});

test('LINE: broadcast รูป + ข้อความ ด้วย channel token', async () => {
  const f = mockFetch({ body: {}, headers: { 'x-line-request-id': 'REQ1' } });
  const id = await line.publish({ secret: { token: 'LT' }, caption: 'โปรวันนี้', imageUrl: 'https://social.example.com/media/a.jpg', fetch: f });
  assert.equal(id, 'REQ1');
  assert.equal(f.calls[0].url, 'https://api.line.me/v2/bot/message/broadcast');
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer LT');
  const msg = JSON.parse(f.calls[0].init.body).messages;
  assert.equal(msg[0].type, 'image');
  assert.equal(msg[1].text, 'โปรวันนี้');
});

test('X: อัปโหลดรูปก่อน แล้วโพสต์พร้อม media_id · เกิน 280 ตัวอักษรไม่ส่ง', async () => {
  const f = mockFetch({ body: { data: { id: 'M1' } } }, { body: { data: { id: 'T1' } } });
  const id = await x.publish({ secret: { token: 'XT' }, caption: 'hello', image, fetch: f });
  assert.equal(id, 'T1');
  assert.equal(f.calls[0].url, 'https://api.x.com/2/media/upload');
  assert.deepEqual(JSON.parse(f.calls[1].init.body), { text: 'hello', media: { media_ids: ['M1'] } });
  await assert.rejects(x.publish({ secret: { token: 'XT' }, caption: 'ก'.repeat(281), image, fetch: mockFetch() }), /280/);
});

test('X: token หมดอายุ → ต่ออายุก่อนโพสต์ และคืน token ใหม่ให้บันทึก', async () => {
  const f = mockFetch({ body: { access_token: 'NEW', refresh_token: 'R2', expires_in: 7200 } }, { body: { data: { id: 'M1' } } }, { body: { data: { id: 'T1' } } });
  const r = await publishTo('x', { cfg, secret: { token: 'OLD', refresh: 'R1', expiresAt: 0 }, caption: 'hi', image, fetch: f, now: 1000 });
  assert.equal(r.renewed.token, 'NEW');
  assert.equal(f.calls[2].init.headers.Authorization, 'Bearer NEW');
});

test('TikTok: ถาม creator info ก่อน แล้วโพสต์รูปแบบ PULL_FROM_URL ตามสิทธิ์ที่มี', async () => {
  const f = mockFetch({ body: { data: { privacy_level_options: ['SELF_ONLY'] }, error: { code: 'ok' } } }, { body: { data: { publish_id: 'PUB1' }, error: { code: 'ok' } } });
  const id = await tiktok.publish({ secret: { token: 'TT' }, caption: 'ท่าเด็ด\nรายละเอียด', imageUrl: 'https://social.example.com/media/a.jpg', fetch: f });
  assert.equal(id, 'PUB1');
  const body = JSON.parse(f.calls[1].init.body);
  assert.equal(body.media_type, 'PHOTO');
  assert.equal(body.source_info.source, 'PULL_FROM_URL');
  assert.equal(body.post_info.privacy_level, 'SELF_ONLY');
  assert.equal(body.post_info.title, 'ท่าเด็ด');
});

test('YouTube ยังไม่รองรับรูป บอกเหตุผลชัดเจน', async () => {
  await assert.rejects(publishTo('yt', { cfg, secret: {}, caption: '', image, fetch: mockFetch() }), /วิดีโอ/);
});

test('ลิงก์ขอสิทธิ์มี state และ redirect_uri ครบ (X ใช้ PKCE)', () => {
  const m = new URL(meta.authUrl({ cfg, state: 'S1', redirectUri: 'https://social.example.com/api/oauth/meta/callback' }));
  assert.equal(m.searchParams.get('state'), 'S1');
  assert.match(m.searchParams.get('scope'), /pages_manage_posts/);
  const xu = new URL(x.authUrl({ cfg, state: 'S2', redirectUri: 'https://r', challenge: 'CH' }));
  assert.equal(xu.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(xu.searchParams.get('code_challenge'), 'CH');
});
