// เซิร์ฟเวอร์ HTTP (ไม่มี dependency): เสิร์ฟหน้าเว็บ + API + OAuth · ทุก API ต้องเข้าสู่ระบบก่อน
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configured } from './env.mjs';
import { pkce, randomToken, safeEqual } from './crypto.mjs';
import { line, meta, tiktok, x } from './connectors.mjs';
import { mergeClientState, PLATFORMS, publicState } from './store.mjs';
import { publishPost } from './scheduler.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const SESSION_MS = 12 * 3600e3;
const OAUTH_MS = 10 * 60e3;
const MAX_JSON = 2_000_000;
const MAX_IMAGE = 8_000_000;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

export function createApp({ cfg, store, fetch: f = fetch, now = () => new Date() }) {
  const sessions = new Map(); // token → หมดอายุ
  const oauth = new Map(); // state → { pf, ws, verifier, exp }
  const pending = new Map(); // key → { ws, pages, exp } (รอเลือกเพจ Facebook)
  const fails = new Map(); // ip → { n, until } กันเดารหัสผ่าน
  const secure = cfg.publicBaseUrl.startsWith('https://');
  const redirectUri = pf => `${cfg.publicBaseUrl || `http://localhost:${String(cfg.port)}`}/api/oauth/${pf}/callback`;

  const send = (res, status, body, headers = {}) => {
    const isBuf = Buffer.isBuffer(body);
    res.writeHead(status, { ...SECURITY_HEADERS, ...(isBuf ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), 'Cache-Control': 'no-store', ...headers });
    res.end(isBuf ? body : JSON.stringify(body));
  };
  const redirect = (res, to, headers = {}) => { res.writeHead(302, { ...SECURITY_HEADERS, Location: to, ...headers }); res.end(); };
  const cookie = req => Object.fromEntries((req.headers.cookie ?? '').split(';').map(c => c.trim().split('=')).filter(p => p.length === 2));
  const authed = req => { const t = cookie(req).tfs_s; const exp = t && sessions.get(t); if (!exp || exp < Date.now()) { if (t) sessions.delete(t); return false; } return true; };
  const ip = req => req.socket.remoteAddress ?? '?';

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0;
      req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('ไฟล์/ข้อมูลใหญ่เกินกำหนด'), { status: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  const json = async req => { try { return JSON.parse((await readBody(req, MAX_JSON)).toString('utf8') || '{}'); } catch (e) { throw Object.assign(new Error(e.status ? e.message : 'ข้อมูลไม่ใช่ JSON'), { status: e.status ?? 400 }); } };
  const findWs = wsId => store.state.workspaces.find(w => w.id === wsId);

  function serveStatic(res, path) {
    const rel = path === '/' ? 'index.html' : path.slice(1);
    if (!/^(index\.html|assets\/[\w.-]+)$/.test(rel)) return send(res, 404, { error: 'ไม่พบหน้า' });
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT)) return send(res, 404, { error: 'ไม่พบหน้า' });
    try { statSync(file); } catch { return send(res, 404, { error: 'ไม่พบหน้า' }); }
    return send(res, 200, readFileSync(file), { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  }

  async function connectDone(res, ws, pf, account, secret) {
    store.setSecret(ws.id, pf, secret);
    ws.accounts[pf] = { on: true, name: account.name, followers: account.followers ?? 0, connectedAt: now().toISOString(), ...(account.extra ?? {}) };
    // โพสต์ที่ล้มเหลวเพราะยังไม่เชื่อม/สิทธิ์หมด → ลองใหม่อีก 1 นาที
    for (const p of store.state.posts) if (p.ws === ws.id && ['failed', 'partial'].includes(p.status) && p.platforms.includes(pf) && p.results?.[pf] && !p.results[pf].ok) { p.status = 'scheduled'; p.at = new Date(now().getTime() + 60e3).toISOString(); }
    store.save();
    if (res) redirect(res, `/#/accounts?connected=${pf}`);
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://local');
    const path = url.pathname;
    try {
      // รูปของโพสต์: เปิดสาธารณะ (แพลตฟอร์มต้องดึงไปได้) แต่ชื่อไฟล์เป็นค่าสุ่มที่เดาไม่ได้
      if (req.method === 'GET' && path.startsWith('/media/')) {
        const m = /^\/media\/([A-Za-z0-9_-]{8,40})\.jpg$/.exec(path);
        if (!m) return send(res, 404, { error: 'ไม่พบรูป' });
        try { return send(res, 200, readFileSync(store.mediaPath(m[1])), { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }); } catch { return send(res, 404, { error: 'ไม่พบรูป' }); }
      }
      if (!path.startsWith('/api/')) return req.method === 'GET' ? serveStatic(res, path) : send(res, 405, { error: 'ไม่รองรับ' });

      if (path === '/api/health') return send(res, 200, { ok: true, server: true, authed: authed(req), configured: configured(cfg), publicBaseUrl: cfg.publicBaseUrl, httpsReady: secure, dryRun: cfg.dryRun });

      if (path === '/api/login' && req.method === 'POST') {
        const f0 = fails.get(ip(req));
        if (f0 && f0.until > Date.now()) return send(res, 429, { error: 'ใส่รหัสผิดหลายครั้ง ลองใหม่ในอีก 15 นาที' });
        const { password } = await json(req);
        if (!cfg.adminPassword || !safeEqual(password ?? '', cfg.adminPassword)) {
          const n = (f0?.n ?? 0) + 1; fails.set(ip(req), { n, until: n >= 5 ? Date.now() + 15 * 60e3 : 0 });
          return send(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' });
        }
        fails.delete(ip(req));
        const t = randomToken(); sessions.set(t, Date.now() + SESSION_MS);
        return send(res, 200, { ok: true }, { 'Set-Cookie': `tfs_s=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${String(SESSION_MS / 1000)}${secure ? '; Secure' : ''}` });
      }
      if (!authed(req)) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบ' });
      // คำขอที่เปลี่ยนข้อมูลต้องมี header นี้ (กัน CSRF — เว็บอื่นส่ง header นี้ข้ามโดเมนไม่ได้)
      if (req.method !== 'GET' && req.headers['x-tfs'] !== '1') return send(res, 403, { error: 'คำขอไม่ถูกต้อง' });

      if (path === '/api/logout' && req.method === 'POST') { sessions.delete(cookie(req).tfs_s); return send(res, 200, { ok: true }, { 'Set-Cookie': 'tfs_s=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }); }
      if (path === '/api/state' && req.method === 'GET') return send(res, 200, publicState(store.state));
      if (path === '/api/state' && req.method === 'PUT') { store.state = mergeClientState(store.state, await json(req)); return send(res, 200, publicState(store.state)); }

      // อัปโหลดรูป (JPEG ที่หน้าเว็บย่อแล้ว)
      if (path === '/api/media' && req.method === 'POST') {
        const ws = findWs(url.searchParams.get('ws'));
        if (!ws) return send(res, 404, { error: 'ไม่พบแบรนด์' });
        const bytes = await readBody(req, MAX_IMAGE);
        if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) return send(res, 415, { error: 'รองรับเฉพาะ JPEG' });
        const mid = randomToken(16);
        store.writeMedia(mid, bytes);
        ws.uploads = [{ id: mid, name: String(url.searchParams.get('name') ?? 'รูป').slice(0, 60), w: Number(url.searchParams.get('w')) || 0, h: Number(url.searchParams.get('h')) || 0 }, ...(ws.uploads ?? [])].slice(0, 500);
        store.save();
        return send(res, 201, { id: mid, url: `/media/${mid}.jpg`, state: publicState(store.state) });
      }
      const mDel = /^\/api\/media\/([A-Za-z0-9_-]{8,40})$/.exec(path);
      if (mDel && req.method === 'DELETE') {
        for (const w of store.state.workspaces) w.uploads = (w.uploads ?? []).filter(u => u.id !== mDel[1]);
        store.deleteMedia(mDel[1]); store.save();
        return send(res, 200, publicState(store.state));
      }

      // โพสต์ทันที
      const pub = /^\/api\/posts\/([A-Za-z0-9_-]{1,40})\/publish$/.exec(path);
      if (pub && req.method === 'POST') {
        const post = store.state.posts.find(p => p.id === pub[1]);
        if (!post) return send(res, 404, { error: 'ไม่พบโพสต์' });
        if (post.status === 'publishing') return send(res, 409, { error: 'กำลังโพสต์อยู่' });
        if (post.status === 'posted') return send(res, 409, { error: 'โพสต์ไปแล้ว' });
        post.status = 'publishing'; post.at = now().toISOString(); store.save();
        await publishPost(store, cfg, post, { fetch: f, now: now() });
        store.save();
        return send(res, 200, { post, state: publicState(store.state) });
      }

      // ---------- เชื่อมบัญชี ----------
      const start = /^\/api\/oauth\/(meta|x|tiktok)\/start$/.exec(path);
      if (start && req.method === 'GET') {
        const pf = start[1]; const ws = findWs(url.searchParams.get('ws'));
        if (!ws) return send(res, 404, { error: 'ไม่พบแบรนด์' });
        if (!configured(cfg)[pf]) return send(res, 400, { error: `ยังไม่ได้ตั้งค่า developer app ของ ${pf} ใน .env` });
        const state = randomToken(24); const p = pkce();
        oauth.set(state, { pf, ws: ws.id, verifier: p.verifier, exp: Date.now() + OAUTH_MS });
        const to = pf === 'meta' ? meta.authUrl({ cfg, state, redirectUri: redirectUri(pf) }) : pf === 'x' ? x.authUrl({ cfg, state, redirectUri: redirectUri(pf), challenge: p.challenge }) : tiktok.authUrl({ cfg, state, redirectUri: redirectUri(pf) });
        return redirect(res, to);
      }
      const cb = /^\/api\/oauth\/(meta|x|tiktok)\/callback$/.exec(path);
      if (cb && req.method === 'GET') {
        const pf = cb[1]; const st = oauth.get(url.searchParams.get('state') ?? '');
        oauth.delete(url.searchParams.get('state') ?? '');
        if (!st || st.pf !== pf || st.exp < Date.now()) return redirect(res, '/#/accounts?error=state');
        if (url.searchParams.get('error')) return redirect(res, `/#/accounts?error=${encodeURIComponent(url.searchParams.get('error'))}`);
        const ws = findWs(st.ws); const code = url.searchParams.get('code') ?? '';
        try {
          if (pf === 'meta') {
            const pages = await meta.exchange({ cfg, code, redirectUri: redirectUri(pf), fetch: f });
            if (!pages.length) return redirect(res, '/#/accounts?error=no_pages');
            const key = randomToken(16); pending.set(key, { ws: ws.id, pages, exp: Date.now() + OAUTH_MS });
            return redirect(res, `/#/accounts?pick=${key}`);
          }
          if (pf === 'x') { const a = await x.exchange({ cfg, code, redirectUri: redirectUri(pf), verifier: st.verifier, fetch: f }); return connectDone(res, ws, 'x', a, a); }
          const a = await tiktok.exchange({ cfg, code, redirectUri: redirectUri(pf), fetch: f }); return connectDone(res, ws, 'tt', a, a);
        } catch (e) { return redirect(res, `/#/accounts?error=${encodeURIComponent(e.message.slice(0, 200))}`); }
      }
      // เลือกเพจ Facebook (และ IG ที่ผูกไว้) หลังขอสิทธิ์
      const pick = /^\/api\/oauth\/meta\/pending\/([A-Za-z0-9_-]{10,40})$/.exec(path);
      if (pick) {
        const pend = pending.get(pick[1]);
        if (!pend || pend.exp < Date.now()) return send(res, 410, { error: 'หมดเวลาเลือกเพจ — เชื่อมต่อใหม่' });
        if (req.method === 'GET') return send(res, 200, { ws: pend.ws, pages: pend.pages.map(p => ({ id: p.id, name: p.name, followers: p.followers, ig: p.ig ? { username: p.ig.username } : null })) });
        if (req.method === 'POST') {
          const { pageId } = await json(req);
          const page = pend.pages.find(p => p.id === String(pageId));
          if (!page) return send(res, 400, { error: 'เลือกเพจไม่ถูกต้อง' });
          pending.delete(pick[1]);
          const ws = findWs(pend.ws);
          await connectDone(null, ws, 'fb', { name: page.name, followers: page.followers }, { pageId: page.id, token: page.token });
          if (page.ig) await connectDone(null, ws, 'ig', { name: `@${page.ig.username}`, followers: page.ig.followers }, { igId: page.ig.id, token: page.token });
          return send(res, 200, publicState(store.state));
        }
      }
      if (path === '/api/accounts/line' && req.method === 'POST') {
        const { ws: wsId, token } = await json(req);
        const ws = findWs(wsId);
        if (!ws) return send(res, 404, { error: 'ไม่พบแบรนด์' });
        if (typeof token !== 'string' || token.length < 20 || token.length > 400) return send(res, 400, { error: 'channel access token ไม่ถูกต้อง' });
        const info = cfg.dryRun ? { name: 'LINE OA (ทดสอบ)' } : await line.verify({ token, fetch: f });
        await connectDone(null, ws, 'line', { name: info.name, followers: 0 }, { token });
        return send(res, 200, publicState(store.state));
      }
      const disc = /^\/api\/accounts\/([A-Za-z0-9_-]{1,40})\/(fb|ig|tt|line|yt|x)$/.exec(path);
      if (disc && req.method === 'DELETE') {
        const ws = findWs(disc[1]); if (!ws) return send(res, 404, { error: 'ไม่พบแบรนด์' });
        store.deleteSecret(ws.id, disc[2]);
        ws.accounts[disc[2]] = { on: false, name: '' };
        store.save();
        return send(res, 200, publicState(store.state));
      }
      if (path === '/api/dev/connect' && req.method === 'POST' && cfg.dryRun) {
        // เฉพาะโหมดทดสอบ: จำลองการเชื่อมบัญชีโดยไม่ต้องมี developer app
        const { ws: wsId, pf } = await json(req); const ws = findWs(wsId);
        if (!ws || !PLATFORMS.includes(pf)) return send(res, 400, { error: 'ข้อมูลไม่ถูกต้อง' });
        await connectDone(null, ws, pf, { name: `${ws.name} (ทดสอบ)`, followers: 0 }, { token: 'dry-run' });
        return send(res, 200, publicState(store.state));
      }
      return send(res, 404, { error: 'ไม่พบ API' });
    } catch (e) {
      return send(res, e.status ?? 500, { error: e.status ? e.message : 'เซิร์ฟเวอร์ผิดพลาด ลองใหม่อีกครั้ง' });
    }
  };
}
