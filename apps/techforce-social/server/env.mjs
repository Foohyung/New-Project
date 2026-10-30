// อ่าน .env (ไม่ใช้ dependency) และรวมค่าตั้งของเซิร์ฟเวอร์ไว้ที่เดียว
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export function config(env = process.env) {
  const base = (env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '127.0.0.1',
    /** URL ที่แพลตฟอร์มเข้าถึงได้ (https) — ใช้ทำ redirect ของ OAuth และลิงก์รูปให้ IG / LINE / TikTok ดึงไป */
    publicBaseUrl: base,
    adminPassword: env.ADMIN_PASSWORD ?? '',
    encKey: env.TOKEN_ENC_KEY ?? '',
    dataDir: env.DATA_DIR ?? fileURLToPath(new URL('../data/', import.meta.url)),
    /** DRY_RUN=1 = ไม่เรียก API ของแพลตฟอร์มจริง (ทดสอบระบบตั้งเวลาได้โดยไม่ต้องมีบัญชี) */
    dryRun: env.DRY_RUN === '1',
    schedulerMs: Number(env.SCHEDULER_MS ?? 30000),
    meta: { appId: env.META_APP_ID ?? '', appSecret: env.META_APP_SECRET ?? '', version: env.META_GRAPH_VERSION ?? 'v21.0' },
    tiktok: { clientKey: env.TIKTOK_CLIENT_KEY ?? '', clientSecret: env.TIKTOK_CLIENT_SECRET ?? '' },
    x: { clientId: env.X_CLIENT_ID ?? '', clientSecret: env.X_CLIENT_SECRET ?? '' },
  };
}

/** ช่องทางที่ตั้งค่า developer app ไว้แล้ว (หน้าเว็บใช้ซ่อน/แสดงปุ่มเชื่อมต่อ) */
export function configured(cfg) {
  return {
    meta: Boolean(cfg.meta.appId && cfg.meta.appSecret),
    tiktok: Boolean(cfg.tiktok.clientKey && cfg.tiktok.clientSecret),
    x: Boolean(cfg.x.clientId),
    line: true, // LINE ใช้ channel access token ของแต่ละ OA (กรอกในหน้าเว็บ)
  };
}
