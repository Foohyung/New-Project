// ปิด server ของทุกเว็บที่ค้างอยู่ (พอร์ต 3001–3003) — ใช้เมื่อ `pnpm dev` ขึ้น EADDRINUSE
// ปิดเฉพาะ process ที่ "เปิดพอร์ตรอรับ" (LISTEN) ไม่แตะเบราว์เซอร์ที่แค่เชื่อมต่ออยู่ · ใช้ได้บน macOS/Linux
import { execFileSync } from 'node:child_process';

const PORTS = { 3001: 'ฟิตเนส', 3002: 'หอพัก', 3003: 'อสังหาฯ' };
let stopped = 0;

for (const [port, name] of Object.entries(PORTS)) {
  let pids = [];
  try {
    pids = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    // lsof คืน exit code 1 เมื่อไม่มี process ใช้พอร์ตนี้
  }
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
      stopped++;
      console.log(`ปิด ${name} (พอร์ต ${port}, pid ${pid})`);
    } catch {
      // process ปิดไปเองแล้ว (เช่น turbo ปิดเว็บอื่นตามกัน) — ไม่ต้องทำอะไร
    }
  }
}

console.log(stopped ? `ปิดแล้ว ${stopped} process — รัน pnpm dev ได้เลย` : 'ไม่มี server ค้างอยู่ที่พอร์ต 3001–3003');
