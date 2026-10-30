// เก็บข้อมูลเป็นไฟล์ JSON ใน DATA_DIR (เขียนแบบ atomic) · token แยกไฟล์และเข้ารหัสทุกรายการ · รูปเก็บที่ DATA_DIR/media
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decrypt, encrypt } from './crypto.mjs';

export const PLATFORMS = ['fb', 'ig', 'tt', 'line', 'yt', 'x'];
const STATUSES = ['draft', 'scheduled', 'publishing', 'posted', 'partial', 'failed'];
const SERVER_OWNED = ['publishing', 'posted', 'partial', 'failed'];

const DEFAULT_POSTERS = [{ t: 'New', s: 'โปรโมชันใหม่', k: 'a' }, { t: 'Sale', s: 'ลดพิเศษ', k: 'b' }, { t: 'Tips', s: 'เคล็ดลับ', k: 'c' }, { t: 'Review', s: 'รีวิวลูกค้า', k: 'a' }];
const emptyAccounts = () => Object.fromEntries(PLATFORMS.map(k => [k, { on: false, name: '' }]));

export function initialState() {
  return {
    v: 1,
    workspaces: [{ id: 'ws-main', name: 'แบรนด์แรกของฉัน', type: 'ธุรกิจ', color: '#7C5CFF', ink: '#FFFFFF', alt: '#38BDF8', handle: 'mybrand', accounts: emptyAccounts(), posters: DEFAULT_POSTERS, uploads: [] }],
    rules: [],
    posts: [],
  };
}

const writeJson = (file, data) => { const tmp = `${file}.tmp`; writeFileSync(tmp, JSON.stringify(data, null, 1)); renameSync(tmp, file); };
const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; } };

export function openStore(dataDir, key) {
  mkdirSync(join(dataDir, 'media'), { recursive: true });
  const stateFile = join(dataDir, 'state.json');
  const secretFile = join(dataDir, 'secrets.json');
  let state = readJson(stateFile, null) ?? initialState();
  const secrets = readJson(secretFile, {});
  const save = () => writeJson(stateFile, state);
  if (!existsSync(stateFile)) save();
  return {
    get state() { return state; },
    set state(s) { state = s; save(); },
    save,
    /** token ของแบรนด์ + ช่องทาง (ถอดรหัสเมื่อใช้เท่านั้น) */
    getSecret(ws, pf) { const b = secrets[`${ws}:${pf}`]; return b ? decrypt(key, b) : null; },
    setSecret(ws, pf, value) { secrets[`${ws}:${pf}`] = encrypt(key, value); writeJson(secretFile, secrets); },
    deleteSecret(ws, pf) { delete secrets[`${ws}:${pf}`]; writeJson(secretFile, secrets); },
    mediaPath: id => join(dataDir, 'media', `${id}.jpg`),
    writeMedia(id, bytes) { writeFileSync(join(dataDir, 'media', `${id}.jpg`), bytes); },
    deleteMedia(id) { try { unlinkSync(join(dataDir, 'media', `${id}.jpg`)); } catch { /* ลบไปแล้ว */ } },
  };
}

/* ---------------- รับข้อมูลจากหน้าเว็บ ---------------- */
const str = (v, max) => String(v ?? '').slice(0, max);
const color = v => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : '#7C5CFF');
const id = v => (/^[A-Za-z0-9_-]{1,40}$/.test(String(v)) ? String(v) : null);
const media = v => (typeof v === 'string' && /^u:[A-Za-z0-9_-]{1,40}$/.test(v) ? v : Number.isInteger(v) && v >= 0 && v < 8 ? v : 0);
const platforms = v => (Array.isArray(v) ? [...new Set(v.filter(k => PLATFORMS.includes(k)))] : []);
const iso = v => { const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); };

/**
 * รวมข้อมูลที่หน้าเว็บส่งมากับข้อมูลบนเซิร์ฟเวอร์
 * - เซิร์ฟเวอร์เป็นเจ้าของ: สถานะการเชื่อมบัญชี, รายการรูป, ผลการโพสต์ (โพสต์ที่กำลังโพสต์/โพสต์แล้ว/ไม่สำเร็จ)
 * - หน้าเว็บเป็นเจ้าของ: ชื่อแบรนด์ เทมเพลต กฎ และโพสต์ที่ยังไม่ได้โพสต์
 * - หน้าเว็บตั้งสถานะ "posted" เองไม่ได้ (ต้องผ่านการโพสต์จริงของเซิร์ฟเวอร์)
 */
export function mergeClientState(server, client) {
  const out = structuredClone(server);
  const byId = new Map(server.workspaces.map(w => [w.id, w]));
  for (const cw of Array.isArray(client?.workspaces) ? client.workspaces.slice(0, 100) : []) {
    const wid = id(cw?.id); if (!wid) continue;
    const prev = byId.get(wid);
    const next = {
      id: wid, name: str(cw.name, 60) || 'แบรนด์', type: str(cw.type, 40), color: color(cw.color), ink: color(cw.ink), alt: color(cw.alt), handle: str(cw.handle, 40),
      posters: (Array.isArray(cw.posters) ? cw.posters.slice(0, 8) : DEFAULT_POSTERS).map(p => ({ t: str(p?.t, 40), s: str(p?.s, 40), k: ['a', 'b', 'c'].includes(p?.k) ? p.k : 'a' })),
      accounts: prev?.accounts ?? emptyAccounts(),
      uploads: prev?.uploads ?? [],
    };
    const i = out.workspaces.findIndex(w => w.id === wid);
    if (i >= 0) out.workspaces[i] = next; else out.workspaces.push(next);
  }
  const wsIds = new Set(out.workspaces.map(w => w.id));

  const prevRules = new Map(server.rules.map(r => [r.id, r]));
  out.rules = (Array.isArray(client?.rules) ? client.rules.slice(0, 500) : []).flatMap(r => {
    const rid = id(r?.id); const ws = id(r?.ws);
    if (!rid || !wsIds.has(ws)) return [];
    const days = Array.isArray(r.days) ? [...new Set(r.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
    return [{ id: rid, ws, icon: str(r.icon, 8), name: str(r.name, 60), days, time: /^\d{2}:\d{2}$/.test(String(r.time)) ? r.time : '', platforms: platforms(r.platforms), media: media(r.media), caption: str(r.caption, 5000), on: Boolean(r.on), event: str(r.event, 200),
      skip: Array.isArray(r.skip) ? r.skip.slice(-50).map(iso) : [], lastRun: prevRules.get(rid)?.lastRun ?? null }];
  });

  const prevPosts = new Map(server.posts.map(p => [p.id, p]));
  const clientPosts = Array.isArray(client?.posts) ? client.posts.slice(0, 5000) : [];
  const seen = new Set();
  const posts = [];
  for (const p of clientPosts) {
    const pid = id(p?.id); const ws = id(p?.ws);
    if (!pid || !wsIds.has(ws) || seen.has(pid)) continue;
    seen.add(pid);
    const prev = prevPosts.get(pid);
    const wanted = STATUSES.includes(p.status) ? p.status : 'draft';
    // โพสต์ที่เซิร์ฟเวอร์จัดการแล้ว: คงไว้ เว้นแต่ผู้ใช้สั่งลองใหม่ (ไม่สำเร็จ → ตั้งเวลา/ร่าง)
    if (prev && SERVER_OWNED.includes(prev.status) && !(['failed', 'partial'].includes(prev.status) && ['scheduled', 'draft'].includes(wanted))) { posts.push(prev); continue; }
    posts.push({ id: pid, ws, at: iso(p.at), platforms: platforms(p.platforms), media: media(p.media), caption: str(p.caption, 5000), status: SERVER_OWNED.includes(wanted) ? 'scheduled' : wanted, stats: null, error: null, results: null, source: str(p.source, 60) || 'manual' });
  }
  // โพสต์ที่กำลังโพสต์อยู่ ห้ามหายแม้หน้าเว็บลบ
  for (const p of server.posts) if (!seen.has(p.id) && p.status === 'publishing') posts.push(p);
  out.posts = posts;
  return out;
}

/** ข้อมูลที่ส่งให้หน้าเว็บ (ไม่มี token) */
export const publicState = state => state;
