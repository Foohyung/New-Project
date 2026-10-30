// ตัวตั้งเวลา: หาโพสต์/รอบของกฎที่ถึงเวลา แล้วโพสต์จริงทีละช่องทาง · บันทึกผลรายช่องทาง
import { readFileSync } from 'node:fs';
import { randomToken } from './crypto.mjs';
import { publishTo } from './connectors.mjs';

/** เกินช่วงนี้ถือว่าพลาดรอบไปแล้ว (เช่น เซิร์ฟเวอร์ปิดไปนาน) — ไม่โพสต์ย้อนหลัง */
export const MISSED_AFTER_MS = 6 * 3600e3;
export const DAILY_LIMIT = 3;

/** รอบล่าสุดของกฎที่ถึงเวลาแล้วแต่ยังไม่ได้รัน (null = ยังไม่ถึง) */
export function dueRuleRun(rule, now = new Date()) {
  if (!rule.on || !rule.time || !rule.days?.length) return null;
  const [h, m] = rule.time.split(':').map(Number);
  for (let back = 0; back <= 1; back++) {
    const d = new Date(now); d.setDate(d.getDate() - back); d.setHours(h, m, 0, 0);
    if (d > now || !rule.days.includes(d.getDay())) continue;
    if (now - d > MISSED_AFTER_MS) return null;
    if (rule.lastRun && new Date(rule.lastRun) >= d) return null;
    if ((rule.skip ?? []).includes(d.toISOString())) return null;
    return d;
  }
  return null;
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** โพสต์หนึ่งรายการไปทุกช่องทางที่เลือก */
export async function publishPost(store, cfg, post, { fetch: f = fetch, now = new Date() } = {}) {
  const ws = store.state.workspaces.find(w => w.id === post.ws);
  const uploadId = typeof post.media === 'string' && post.media.startsWith('u:') ? post.media.slice(2) : null;
  const results = {};
  let image = null;
  if (uploadId) { try { image = { bytes: readFileSync(store.mediaPath(uploadId)) }; } catch { image = null; } }
  const imageUrl = uploadId && cfg.publicBaseUrl ? `${cfg.publicBaseUrl}/media/${uploadId}.jpg` : '';
  for (const pf of post.platforms) {
    try {
      if (!image) throw new Error('ไม่มีรูปของโพสต์นี้ (อัปโหลดรูปใหม่)');
      if (!ws?.accounts?.[pf]?.on) throw new Error('ยังไม่ได้เชื่อมบัญชีช่องทางนี้');
      const today = store.state.posts.filter(p => p.ws === post.ws && p.id !== post.id && p.results?.[pf]?.ok && sameDay(p.at, now)).length;
      if (today >= DAILY_LIMIT) throw new Error(`โพสต์ช่องทางนี้ครบ ${DAILY_LIMIT} ครั้งแล้ววันนี้ (กันโพสต์ถี่เกิน)`);
      if (cfg.dryRun) { results[pf] = { ok: true, id: `dry-${randomToken(6)}`, at: now.toISOString() }; continue; }
      const secret = store.getSecret(post.ws, pf);
      if (!secret) throw new Error('ไม่พบสิทธิ์ของบัญชี — เชื่อมต่อใหม่');
      const r = await publishTo(pf, { cfg, secret, caption: post.caption, image, imageUrl, fetch: f, now: now.getTime() });
      if (r.renewed) store.setSecret(post.ws, pf, r.renewed);
      results[pf] = { ok: true, id: r.id, at: new Date().toISOString() };
    } catch (e) {
      results[pf] = { ok: false, error: e.message };
    }
  }
  const ok = Object.values(results).filter(r => r.ok).length;
  post.results = results;
  post.status = ok === post.platforms.length ? 'posted' : ok === 0 ? 'failed' : 'partial';
  post.error = ok === post.platforms.length ? null : Object.entries(results).filter(([, r]) => !r.ok).map(([k, r]) => `${k}: ${r.error}`).join(' · ');
  post.stats = post.stats ?? Object.fromEntries(Object.entries(results).filter(([, r]) => r.ok).map(([k]) => [k, 0]));
  return post;
}

let running = false;
/** หนึ่งรอบของตัวตั้งเวลา (เรียกทุก SCHEDULER_MS) */
export async function tick(store, cfg, { fetch: f = fetch, now = new Date() } = {}) {
  if (running) return { skipped: true };
  running = true;
  try {
    const s = store.state;
    const due = s.posts.filter(p => p.status === 'scheduled' && new Date(p.at) <= now);
    for (const p of due) {
      if (now - new Date(p.at) > MISSED_AFTER_MS) { p.status = 'failed'; p.error = 'พลาดเวลาโพสต์ (เซิร์ฟเวอร์ปิดอยู่ตอนถึงเวลา) — แก้เวลาแล้วตั้งใหม่'; continue; }
      p.status = 'publishing'; store.save();
      await publishPost(store, cfg, p, { fetch: f, now });
      store.save();
    }
    for (const r of s.rules) {
      const run = dueRuleRun(r, now);
      if (!run) continue;
      r.lastRun = run.toISOString();
      const post = { id: `p-${randomToken(6)}`, ws: r.ws, at: run.toISOString(), platforms: [...r.platforms], media: r.media, caption: r.caption, status: 'publishing', stats: null, error: null, results: null, source: `rule:${r.id}` };
      s.posts.push(post); store.save();
      await publishPost(store, cfg, post, { fetch: f, now });
      store.save();
    }
    return { posts: due.length };
  } finally {
    running = false;
  }
}
