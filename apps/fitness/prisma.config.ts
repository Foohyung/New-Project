// ตั้งค่า Prisma CLI (migrate / generate / db seed) — อ่าน DATABASE_URL จาก .env
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.mjs' },
  // generate ใช้ได้โดยไม่ต้องมี DATABASE_URL · migrate/seed ต้องมี
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
