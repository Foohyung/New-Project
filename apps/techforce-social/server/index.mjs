// เริ่มเซิร์ฟเวอร์: node server/index.mjs  (อ่านค่าจาก .env ในโฟลเดอร์โปรเจกต์)
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { keyFrom } from './crypto.mjs';
import { config, configured, loadEnv } from './env.mjs';
import { tick } from './scheduler.mjs';
import { openStore } from './store.mjs';

loadEnv(fileURLToPath(new URL('../.env', import.meta.url)));
const cfg = config();

const problems = [];
if (!cfg.adminPassword || cfg.adminPassword.length < 10) problems.push('ADMIN_PASSWORD ต้องยาวอย่างน้อย 10 ตัวอักษร');
let key;
try { key = keyFrom(cfg.encKey); } catch (e) { problems.push(e.message); }
if (problems.length) {
  console.error(`ตั้งค่าไม่ครบ (ดู .env.example):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const store = openStore(cfg.dataDir, key);
const server = createServer(createApp({ cfg, store }));
server.listen(cfg.port, cfg.host, () => {
  const c = configured(cfg);
  console.log(`TechForce Social → http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${String(cfg.port)}`);
  console.log(`ช่องทาง: Facebook/IG ${c.meta ? '✓' : '✗'} · TikTok ${c.tiktok ? '✓' : '✗'} · X ${c.x ? '✓' : '✗'} · LINE ✓ (กรอก token ในหน้าเว็บ)${cfg.dryRun ? ' · DRY_RUN (ไม่โพสต์จริง)' : ''}`);
  if (!cfg.publicBaseUrl.startsWith('https://')) console.log('หมายเหตุ: ยังไม่ได้ตั้ง PUBLIC_BASE_URL แบบ https — Instagram / LINE / TikTok ดึงรูปไม่ได้ และ OAuth ใช้ได้เฉพาะ localhost');
});

const timer = setInterval(() => { tick(store, cfg).catch(e => console.error('scheduler:', e.message)); }, cfg.schedulerMs);
const stop = () => { clearInterval(timer); server.close(() => process.exit(0)); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
