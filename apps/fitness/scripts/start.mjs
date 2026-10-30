// pnpm start — รันเว็บแบบ production จากผล `pnpm build` (output: standalone) ด้วยคำสั่งเดียว ใช้ได้ทั้ง Windows/macOS/Linux
// 1) คัดลอก .next/static (และ public) ไปไว้ข้าง server.js  2) อ่านค่าจาก .env  3) รัน server.js
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const at = (...p) => path.join(root, ...p);

// build ในโฟลเดอร์นี้เดี่ยว ๆ → .next/standalone/server.js · build ใน monorepo → .next/standalone/apps/fitness/server.js
const standalone = [at('.next', 'standalone'), at('.next', 'standalone', 'apps', 'fitness')].find(dir => existsSync(path.join(dir, 'server.js')));
if (!standalone) {
  console.error('ยังไม่ได้ build — รัน "pnpm build" ก่อน แล้วค่อย "pnpm start"');
  process.exit(1);
}

cpSync(at('.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
if (existsSync(at('public'))) cpSync(at('public'), path.join(standalone, 'public'), { recursive: true });

// ค่าที่ตั้งไว้ใน environment อยู่แล้วชนะค่าในไฟล์ · ไฟล์แรกที่เจอชนะไฟล์ถัดไป
for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  if (existsSync(at(file))) process.loadEnvFile(at(file));
}
process.env.PORT ??= '3001';
process.env.HOSTNAME ??= '127.0.0.1';

console.log(`FitFlow → http://${process.env.HOSTNAME === '0.0.0.0' ? '<IP ของเครื่อง>' : process.env.HOSTNAME}${process.env.PORT === '80' ? '' : `:${process.env.PORT}`}${process.env.ALLOW_HTTP === '1' ? '  (ALLOW_HTTP=1: ใช้ผ่าน http ได้ — สำหรับทดสอบเท่านั้น)' : ''}`);
await import(pathToFileURL(path.join(standalone, 'server.js')).href);
