// ทดสอบเซิร์ฟเวอร์ทั้งระบบ (DRY_RUN: ไม่เรียกแพลตฟอร์มจริง)
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../app.mjs';
import { keyFrom } from '../crypto.mjs';
import { config } from '../env.mjs';
import { tick } from '../scheduler.mjs';
import { openStore } from '../store.mjs';

const dir = mkdtempSync(join(tmpdir(), 'tfs-'));
const cfg = config({ ADMIN_PASSWORD: 'correct-horse-battery', TOKEN_ENC_KEY: randomBytes(32).toString('base64'), DATA_DIR: dir, DRY_RUN: '1', PUBLIC_BASE_URL: 'https://social.example.com' });
const store = openStore(dir, keyFrom(cfg.encKey));
let base, server, cookie = '';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);

before(async () => {
  server = createServer(createApp({ cfg, store }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${String(server.address().port)}`;
});
after(() => server.close());

const req = (method, path, body, headers = {}) => fetch(base + path, { method, redirect: 'manual', headers: { cookie, 'X-TFS': '1', ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: Buffer.isBuffer(body) ? body : body ? JSON.stringify(body) : undefined });

test('ยังไม่เข้าสู่ระบบ: เปิดหน้าเว็บได้ แต่ API ถูกปฏิเสธ', async () => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/api/state`)).status, 401);
  const h = await (await fetch(`${base}/api/health`)).json();
  assert.equal(h.server, true);
  assert.equal(h.authed, false);
});

test('ไฟล์นอกโปรเจกต์เปิดไม่ได้ และมี security header', async () => {
  for (const p of ['/../package.json', '/server/app.mjs', '/.env', '/data/state.json', '/assets/../server/crypto.mjs']) assert.equal((await fetch(base + p)).status, 404, p);
  const r = await fetch(`${base}/assets/app.js`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('รหัสผิดถูกปฏิเสธ · รหัสถูกได้ cookie แบบ HttpOnly', async () => {
  assert.equal((await req('POST', '/api/login', { password: 'wrong' })).status, 401);
  const r = await req('POST', '/api/login', { password: 'correct-horse-battery' });
  assert.equal(r.status, 200);
  const set = r.headers.get('set-cookie');
  assert.match(set, /HttpOnly/);
  assert.match(set, /Secure/);
  cookie = set.split(';')[0];
});

test('คำขอที่ไม่มี header X-TFS ถูกปฏิเสธ (กัน CSRF)', async () => {
  const r = await fetch(`${base}/api/state`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
});

test('อัปโหลดรูป → ตั้งเวลาโพสต์ → ตัวตั้งเวลาโพสต์ให้ครบทุกช่องทางที่เชื่อม', async () => {
  // รับเฉพาะ JPEG
  assert.equal((await req('POST', '/api/media?ws=ws-main&name=a.png', Buffer.from('not an image'))).status, 415);
  const up = await (await req('POST', '/api/media?ws=ws-main&name=promo.jpg&w=1080&h=1080', JPEG)).json();
  assert.match(up.id, /^[A-Za-z0-9_-]{16,}$/);
  // รูปเปิดได้โดยไม่ต้องเข้าสู่ระบบ (แพลตฟอร์มต้องดึงไป)
  const pub = await fetch(`${base}/media/${up.id}.jpg`);
  assert.equal(pub.status, 200);
  assert.equal(pub.headers.get('content-type'), 'image/jpeg');

  for (const pf of ['fb', 'line']) assert.equal((await req('POST', '/api/dev/connect', { ws: 'ws-main', pf })).status, 200);
  const st = await (await req('GET', '/api/state')).json();
  assert.equal(st.workspaces[0].accounts.fb.on, true);
  assert.ok(!JSON.stringify(st).includes('dry-run'), 'token ต้องไม่ถูกส่งให้หน้าเว็บ');
  assert.ok(!readFileSync(join(dir, 'secrets.json'), 'utf8').includes('dry-run'), 'token ต้องถูกเข้ารหัสในไฟล์');

  const past = new Date(Date.now() - 60e3).toISOString();
  const put = await req('PUT', '/api/state', { ...st, posts: [{ id: 'p-sched', ws: 'ws-main', at: past, platforms: ['fb', 'line', 'x'], media: `u:${up.id}`, caption: 'โปรวันนี้', status: 'scheduled' }] });
  assert.equal(put.status, 200);
  await tick(store, cfg);
  const post = store.state.posts.find(p => p.id === 'p-sched');
  assert.equal(post.status, 'partial');
  assert.equal(post.results.fb.ok, true);
  assert.equal(post.results.line.ok, true);
  assert.match(post.results.x.error, /ยังไม่ได้เชื่อม/);
});

test('โพสต์ทันทีผ่าน API ได้ผลกลับมาทันที และโพสต์ซ้ำไม่ได้', async () => {
  const st = await (await req('GET', '/api/state')).json();
  const media = `u:${st.workspaces[0].uploads[0].id}`;
  await req('PUT', '/api/state', { ...st, posts: [...st.posts, { id: 'p-now', ws: 'ws-main', at: new Date().toISOString(), platforms: ['fb'], media, caption: 'ด่วน', status: 'scheduled' }] });
  const r = await (await req('POST', '/api/posts/p-now/publish')).json();
  assert.equal(r.post.status, 'posted');
  assert.equal((await req('POST', '/api/posts/p-now/publish')).status, 409);
});

test('กฎที่ถึงเวลา สร้างโพสต์และโพสต์ให้อัตโนมัติ ครั้งเดียวต่อรอบ', async () => {
  const st = await (await req('GET', '/api/state')).json();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const media = `u:${st.workspaces[0].uploads[0].id}`;
  await req('PUT', '/api/state', { ...st, rules: [{ id: 'r-test', ws: 'ws-main', icon: '☕', name: 'ทุกวัน', days: [0, 1, 2, 3, 4, 5, 6], time: hhmm, platforms: ['line'], media, caption: 'อรุณสวัสดิ์', on: true }] });
  await tick(store, cfg, { now: new Date(now.getTime() + 1000) });
  await tick(store, cfg, { now: new Date(now.getTime() + 2000) });
  const fromRule = store.state.posts.filter(p => p.source === 'rule:r-test');
  assert.equal(fromRule.length, 1);
  assert.equal(fromRule[0].status, 'posted');
});

test('ยกเลิกการเชื่อมลบ token ของช่องทางนั้น', async () => {
  const r = await (await req('DELETE', '/api/accounts/ws-main/fb')).json();
  assert.equal(r.workspaces[0].accounts.fb.on, false);
  assert.equal(store.getSecret('ws-main', 'fb'), null);
});
