// §10.11 ตรวจ license ของ production dependency — fail เมื่อเจอ license ต้องห้ามหรือไม่ระบุ license
// ใช้: pnpm -r licenses list --prod --json | node scripts/check-licenses.mjs
const DENY = /\b(A?GPL|SSPL|BUSL|Commons Clause|CC-BY-NC)/i; // LGPL ใช้แบบ dynamic link ได้ จึงไม่อยู่ในรายการ
const UNKNOWN = /^(unknown|unlicensed|)$/i;

let input = '';
for await (const chunk of process.stdin) input += chunk;
const byLicense = JSON.parse(input || '{}');

const problems = [];
for (const [license, pkgs] of Object.entries(byLicense)) {
  const denied = DENY.test(license.replace(/\bLGPL/gi, ''));
  if (denied || UNKNOWN.test(license.trim())) {
    for (const pkg of pkgs) problems.push(`${license}\t${pkg.name}@${pkg.versions.join(',')}`);
  }
}

const total = Object.values(byLicense).reduce((n, pkgs) => n + pkgs.length, 0);
if (problems.length) {
  console.error(`พบ license ที่ใช้ไม่ได้ ${problems.length} รายการ:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`ตรวจ license แล้ว ${total} package — ผ่าน (${Object.keys(byLicense).join(', ')})`);
