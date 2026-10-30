# Web Projects Monorepo

รวมโปรเจกต์เว็บทั้งหมด แต่ละโปรเจกต์แยกโฟลเดอร์อยู่ใน `apps/` และทุกโปรเจกต์ต้องทำตาม [มาตรฐานการพัฒนาเว็บ](docs/ENGINEERING-STANDARD.md)

| โปรเจกต์ | โฟลเดอร์ | สถานะ |
|---|---|---|
| ระบบจัดการฟิตเนส | [`apps/fitness`](apps/fitness) | 🚧 ระยะที่ 1 เสร็จ — เว็บตามแบบ 1 Pulse · http://localhost:3001 |
| ระบบอสังหาริมทรัพย์ | [`apps/real-estate`](apps/real-estate) | 🚧 ระยะที่ 1 เสร็จ — เว็บตามแบบ 3 Hearth · http://localhost:3002 |
| ระบบจองทัวร์ | [`apps/tour-booking`](apps/tour-booking) | 🎨 รอเลือก design (Horizon · Journey · Getaway) |
| โพสต์อัตโนมัติหลายแบรนด์ (TechForce Social) | [`apps/techforce-social`](apps/techforce-social) | 🧪 หน้าเว็บ HTML + เซิร์ฟเวอร์ Node · เชื่อม FB/IG/TikTok/LINE/X (รอทดสอบกับบัญชีจริง) · http://localhost:8787 |

**ระยะที่ 1 (เสร็จแล้ว):** หน้าเว็บตาม design ที่เลือก, business logic พร้อม unit test, ข้อมูลตัวอย่างผ่าน Data Access Layer, security headers + CSP แบบ nonce, E2E 3 ขนาดจอ และ CI
**ระยะที่ 2 (ถัดไป):** PostgreSQL + Prisma, login ด้วย Better Auth + 2FA, RBAC, audit log ลงฐานข้อมูล, Redis rate limit และแจ้งเตือนผ่าน LINE OA

## เริ่มใช้งาน

ต้องมี Node.js 24 (ดู `.nvmrc`) และ pnpm 12 (เวอร์ชันระบุใน `packageManager`)

```bash
pnpm install
pnpm dev          # เปิดทุกเว็บพร้อมกัน (ฟิตเนส + อสังหาฯ)
```

| เว็บ | URL | หน้าที่มี |
|---|---|---|
| ฟิตเนส | http://localhost:3001 | แดชบอร์ด, รายชื่อสมาชิก, เช็กอิน |
| อสังหาฯ | http://localhost:3002 | หน้าแรก + ค้นหา/กรอง, หน้าประกาศ + ฟอร์มนัดชม, sitemap/robots |

ค่า env ของแต่ละเว็บดูได้ใน `apps/<project>/.env.example`

### คำสั่งตรวจคุณภาพ

| คำสั่ง | ทำอะไร |
|---|---|
| `pnpm check` | lint + typecheck + unit test ทุกโปรเจกต์ |
| `pnpm build` | build production ทุกเว็บ |
| `pnpm test:e2e` | E2E ด้วย Playwright ที่ขนาดมือถือ / แท็บเล็ต / เดสก์ท็อป (ต้องมี Google Chrome ในเครื่อง) |
| `pnpm --filter @app/fitness dev` | รันเฉพาะเว็บเดียว (หรือ `@app/real-estate`) |

CI อยู่ที่ [`.github/workflows/ci.yml`](.github/workflows/ci.yml): lint · typecheck · unit · build · E2E และ security scan (pnpm audit, license, gitleaks, Semgrep) ส่วน dependency อัปเดตผ่าน Renovate ([`renovate.json`](renovate.json))

## ดู Design ทั้งหมด

Design เป็นไฟล์ HTML ธรรมดาอยู่ใน `apps/<project>/designs/` และภาพโปรโมท PDF อยู่ใน `apps/<project>/promo/` เปิดหน้ารวม design ได้ที่ [`docs/design-gallery.html`](docs/design-gallery.html) (เปิดในเบราว์เซอร์ได้เลย)

## โครงสร้าง

```
apps/<project>/
  src/app/         # หน้าเว็บ (Next.js App Router)
  src/components/  # UI — ห้าม import จาก src/server (บังคับด้วย ESLint)
  src/features/    # business logic + schema + server action แยกตามโดเมน
  src/server/      # Data Access Layer (server-only) — ตรวจสิทธิ์และคืน DTO
  e2e/             # Playwright
  designs/ promo/  # HTML mockup และ PDF โปรโมท
packages/
  config/          # tsconfig + ESLint ร่วม
  security/        # CSP, security headers
  utils/           # เงิน (สตางค์), วันที่ พ.ศ., เบอร์โทร
  testing/         # Playwright config ร่วม + ตรวจ scroll แนวนอน
docs/              # มาตรฐานกลางและเอกสารร่วม
```

ฟิตเนส (`apps/fitness`) ใช้โครง `src/web` (Frontend) + `src/api` (Backend) แบ่งเป็น ชนิด (app, components, actions, dal, …) > เรื่อง > โฟลเดอร์ > ไฟล์ — ดู [apps/fitness/docs/STRUCTURE.md](apps/fitness/docs/STRUCTURE.md)
