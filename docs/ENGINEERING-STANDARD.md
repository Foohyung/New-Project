# มาตรฐานการพัฒนาเว็บ (Web Engineering Standard)

> **เวอร์ชัน:** 1.2 · **อัปเดตล่าสุด:** 2026-10-16
> **ใช้กับ:** ทุกโปรเจกต์เว็บใน repository นี้ — Fitness, Dormitory, Real Estate, Company Website และโปรเจกต์ใหม่ในอนาคต

เอกสารนี้เป็นกติกากลางที่ทุกโปรเจกต์ต้องทำตาม เพื่อให้ทุกเว็บใช้ stack, คุณภาพ, ความปลอดภัย และวิธีทำงานแบบเดียวกัน ถ้าต้องทำต่างออกไปให้เขียน ADR ตาม §21

### ระดับของข้อกำหนด

| คำ | ความหมาย |
|---|---|
| **ต้อง** (MUST) | บังคับ — CI หรือ reviewer จะไม่ให้ผ่านถ้าไม่ทำ |
| **ห้าม** (MUST NOT) | ห้ามทำเด็ดขาด |
| **ควร** (SHOULD) | ทำเป็นค่าเริ่มต้น ถ้าไม่ทำต้องมีเหตุผลที่บันทึกไว้ |
| **อาจ** (MAY) | ทางเลือก ทำหรือไม่ทำก็ได้ |

## สารบัญ

1. หลักการ
2. Tech Stack มาตรฐาน
3. โครงสร้างโปรเจกต์
4. มาตรฐานการเขียนโค้ด
5. Database
6. Server Actions & API
7. Testing
8. Git Workflow & Code Review
9. CI/CD & Deployment
10. Security
11. PDPA & ข้อมูลส่วนบุคคล
12. Observability & Audit Log
13. Backup & Disaster Recovery
14. Performance
15. UX, Responsive, Accessibility & ภาษาไทย
16. SEO (เว็บสาธารณะ)
17. เอกสารประจำโปรเจกต์
18. Definition of Done
19. Checklist เริ่มโปรเจกต์ใหม่ & ก่อนขึ้น Production
20. Incident Response
21. การขอข้อยกเว้นและการแก้ไขมาตรฐาน
- ภาคผนวก A: ข้อกำหนดเฉพาะโดเมน
- ภาคผนวก B: Templates

---

## 1. หลักการ

1. **Secure by default** — ค่าเริ่มต้นต้องปลอดภัย การเปิดสิทธิ์ต้องเป็นการตั้งใจทำ (deny by default)
2. **Stack เดียวทุกโปรเจกต์** — เรียนรู้ครั้งเดียว ย้ายคนข้ามโปรเจกต์ได้ แชร์โค้ดได้
3. **ตรรกะธุรกิจต้องทดสอบได้** — แยก business logic ออกจาก UI และ framework
4. **Automate everything** — อะไรที่เครื่องตรวจได้ต้องอยู่ใน CI ไม่ใช่อยู่ในความจำของคน
5. **Privacy by design** — เก็บข้อมูลเท่าที่จำเป็น และคิดเรื่อง PDPA ตั้งแต่ออกแบบ schema
6. **เรียบง่ายก่อน** — เพิ่มความซับซ้อน (microservices, cache, queue แยก) เมื่อมีหลักฐานว่าจำเป็นเท่านั้น
7. **Build once, deploy many** — artifact ตัวเดียวกันวิ่งจาก staging ไปถึง production

---

## 2. Tech Stack มาตรฐาน

### 2.1 Core

| หมวด | มาตรฐาน | เวอร์ชันอ้างอิง (ต.ค. 2026) | หมายเหตุ |
|---|---|---|---|
| Runtime | Node.js (Active LTS) | 24.x | ย้ายไป LTS ตัวถัดไปภายใน 6 เดือนหลังออก |
| Package manager | pnpm (ผ่าน Corepack) | 12.x | ระบุใน `packageManager` ของ `package.json` |
| Monorepo | pnpm workspaces + Turborepo | turbo 2.x | |
| ภาษา | TypeScript (`strict`) | **6.0.x** | ⚠️ ยังไม่ใช้ TS 7 จนกว่า typescript-eslint จะรองรับ (ปัจจุบันรองรับ `< 6.1`) |
| Framework | Next.js (App Router) + React | Next 16.x / React 19.x | |
| UI | Tailwind CSS + shadcn/ui | Tailwind 4.x | icons: lucide-react |
| ฟอร์ม/Validation | React Hook Form + Zod | Zod 4.x | Zod schema ชุดเดียวใช้ทั้ง client และ server |
| Client data | TanStack Query | 5.x | เฉพาะหน้าที่ interactive สูง ปกติใช้ Server Components |
| ตาราง / กราฟ | TanStack Table / Recharts | | |
| Database | PostgreSQL | 18 (หรือ 17) | เพิ่ม PostGIS เมื่อมีงานแผนที่ |
| ORM | Prisma | **7.x** | ⚠️ tag `latest` บน npm ตอนนี้ชี้ไป 8.0 RC — ต้องระบุเวอร์ชันเอง |
| Auth | Better Auth | 1.x | ใช้ plugin 2FA, passkey, access control |
| Background jobs / Cron | pg-boss | | queue บน Postgres — enqueue ใน transaction เดียวกับข้อมูลได้ |
| Cache / Rate limit | Redis (หรือ Valkey) | | |
| File storage | Cloudflare R2 (S3-compatible) | | private bucket เป็นค่าเริ่มต้น |
| Email | React Email + Resend หรือ AWS SES | | |
| Unit / Integration test | Vitest + Testcontainers | Vitest 5.x | |
| E2E test | Playwright | 1.x | |
| Errors / Logs / Tracing | Sentry / Pino / OpenTelemetry | | |
| Container | Docker (Next.js `output: "standalone"`) | | |
| Deploy | Coolify บน VPS (ค่าเริ่มต้น) หรือ Vercel (ทางเลือก) | | |

### 2.2 บริการและเครื่องมือสำหรับประเทศไทย

| ความต้องการ | มาตรฐาน |
|---|---|
| ฟอนต์ | IBM Plex Sans Thai / Noto Sans Thai ผ่าน `next/font` |
| รับเงินผ่าน QR | PromptPay QR (`promptpay-qr`) + API ตรวจสลิป |
| บัตรเครดิต / ตัดเงินอัตโนมัติ | Omise |
| แจ้งเตือนผู้ใช้ | LINE Messaging API (LINE OA) — **ห้าม** ใช้ LINE Notify (ปิดบริการตั้งแต่ มี.ค. 2025) |
| วันที่ พ.ศ. | แสดงผลด้วย `Intl.DateTimeFormat('th-TH')` (ใช้ปฏิทินพุทธเป็นค่าเริ่มต้น) คำนวณด้วย date-fns + `@date-fns/tz` |
| เงินบาท | `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })` |
| ที่อยู่ไทย | dataset จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์ เก็บใน `packages/utils` |
| แผนที่ | react-leaflet + OpenStreetMap (ค่าเริ่มต้น) หรือ Google Maps (ถ้าต้องใช้ Places) |
| PDF ภาษาไทย | `@react-pdf/renderer` + register ฟอนต์ไทย |
| หลายภาษา | next-intl |

### 2.3 นโยบายเวอร์ชันและ dependency

- **ต้อง** commit `pnpm-lock.yaml` และใช้ `pnpm install --frozen-lockfile` ใน CI
- **ต้อง** ใช้ Renovate จัดการการอัปเดต: patch/minor รวมเป็น PR รายสัปดาห์ ส่วน major แยก PR ทีละตัว
- **ต้อง** ตั้ง `minimumReleaseAge` ของ pnpm (แนะนำอย่างน้อย 3 วัน) เพื่อไม่ติดตั้ง package ที่เพิ่งปล่อย ป้องกัน supply-chain attack
- **ต้อง** อนุญาต install/lifecycle scripts เฉพาะ package ที่ระบุไว้ใน allowlist ของ `pnpm-workspace.yaml` เท่านั้น
- **ห้าม** ใช้ `@latest` ในคำสั่งติดตั้งหรือสคริปต์ ต้องระบุ major เสมอ
- Security patch ระดับ Critical ของ Next.js/React **ต้อง** อัปเดตภายใน 48 ชั่วโมง (ดู §10.14)

### 2.4 เกณฑ์การเพิ่ม library ใหม่

ก่อนเพิ่ม dependency **ต้อง** ผ่านทุกข้อ:

- ยังมีคนดูแล (มี release ภายใน 12 เดือน และ issue ได้รับการตอบ)
- License เป็น MIT / Apache-2.0 / BSD / ISC — **ห้าม** GPL/AGPL ในโค้ดที่ส่งมอบ
- ไม่มีช่องโหว่ระดับ High/Critical ที่ยังไม่แก้
- ไม่ใช่ฟังก์ชันเล็ก ๆ ที่เขียนเองได้ในไม่กี่สิบบรรทัด
- ถ้าเป็นการเปลี่ยนหรือเพิ่มของระดับ core (ตาราง §2.1) **ต้อง** เขียน ADR

---

## 3. โครงสร้างโปรเจกต์

### 3.1 Monorepo

```
<root>/
├── apps/
│   ├── fitness/
│   ├── dormitory/
│   ├── real-estate/
│   ├── company-website/
│   └── <new-project>/
├── packages/
│   ├── ui/            # shadcn components + design tokens (CSS theme)
│   ├── auth/          # Better Auth config, roles, permission helpers
│   ├── security/      # headers, rate limit, encryption, audit log
│   ├── utils/         # เงินบาท, พ.ศ., PromptPay, ที่อยู่ไทย
│   ├── config/        # tsconfig, eslint, prettier, vitest presets
│   └── testing/       # factories, test helpers, Testcontainers setup
├── docs/              # มาตรฐานนี้ + ADR กลาง
├── .github/           # workflows, CODEOWNERS, PR template
├── pnpm-workspace.yaml
├── turbo.json
└── renovate.json
```

- แต่ละ app **ต้อง** มี database, secrets, domain และ pipeline deploy ของตัวเอง สิ่งที่แชร์กันได้มีแค่โค้ดใน `packages/`
- `packages/*` **ห้าม** import จาก `apps/*`
- **ข้อยกเว้น:** โปรเจกต์ที่ต้องส่งมอบ source code ให้ลูกค้าคนละราย อาจแยกเป็น repo อิสระได้ โดย copy `packages/` ที่ใช้ไปด้วย และยังต้องทำตามมาตรฐานนี้ทุกข้อ

### 3.2 โครงสร้างภายใน app

```
apps/<project>/
├── src/
│   ├── app/                    # Routes เท่านั้น — เขียนให้บาง แล้วเรียก feature
│   │   ├── (public)/           # หน้าที่ไม่ต้อง login
│   │   ├── (app)/              # หน้าหลัง login
│   │   └── api/                # Route Handlers: webhook, health, API ภายนอก
│   ├── features/<feature>/     # 1 โฟลเดอร์ต่อ 1 โดเมน เช่น billing, members
│   │   ├── components/
│   │   ├── actions.ts          # Server Actions (entrypoint)
│   │   ├── service.ts          # business logic — ส่วนที่ test หนักที่สุด
│   │   ├── schema.ts           # Zod schemas
│   │   └── *.test.ts
│   ├── server/
│   │   ├── dal/                # Data Access Layer — ตรวจสิทธิ์ทุก query
│   │   ├── db.ts               # Prisma client (import 'server-only')
│   │   └── jobs/               # pg-boss workers
│   └── lib/
├── prisma/                     # schema, migrations, seed.ts
├── tests/integration/
├── e2e/
├── designs/                    # HTML mockups / design references
├── docs/                       # ARCHITECTURE, RBAC, DATA-CLASSIFICATION, runbooks, adr
├── Dockerfile
└── .env.example
```

### 3.3 กฎการ import (Layering)

```
app/ → features/*/actions → features/*/service → server/dal → server/db
```

- Client component **ห้าม** import จาก `server/` โดยตรง
- `service.ts` **ควร** เป็น pure function ให้มากที่สุด (รับข้อมูลเข้าแล้วคืนผลลัพธ์) เพื่อให้ unit test ได้โดยไม่ต้องมี DB
- ไฟล์ใน `server/` **ต้อง** มี `import 'server-only'`
- บังคับกฎเหล่านี้ด้วย ESLint (`no-restricted-imports` หรือ boundaries rule)

### 3.4 การตั้งชื่อ

| สิ่งที่ตั้งชื่อ | รูปแบบ | ตัวอย่าง |
|---|---|---|
| ไฟล์ / โฟลเดอร์ | kebab-case | `meter-reading-form.tsx` |
| React component | PascalCase | `MeterReadingForm` |
| ฟังก์ชัน / ตัวแปร | camelCase | `calculateMonthlyBill` |
| ค่าคงที่ | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Prisma model | PascalCase เอกพจน์ | `Invoice` |
| ตาราง / คอลัมน์ DB | snake_case (ผ่าน `@@map` / `@map`) | `invoices.due_date` |
| Env var | UPPER_SNAKE_CASE ถ้าใช้ฝั่ง client ขึ้นต้นด้วย `NEXT_PUBLIC_` | `DATABASE_URL` |
| Branch | `<type>/<short-desc>` | `feat/meter-reading` |

ชื่อในโค้ดใช้ภาษาอังกฤษ ส่วนข้อความที่ผู้ใช้เห็นเป็นภาษาไทยและอยู่ใน message file ของ i18n

---

## 4. มาตรฐานการเขียนโค้ด

### 4.1 TypeScript & Lint

- เปิด `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- **ห้าม** ใช้ `any` (ตั้งเป็น ESLint error) ให้ใช้ `unknown` แล้ว narrow ด้วย Zod
- **ห้าม** ใช้ `@ts-ignore` ถ้าจำเป็นจริงให้ใช้ `@ts-expect-error` พร้อมเขียนเหตุผล
- ESLint flat config + typescript-eslint `strict-type-checked` + `eslint-config-next` และจัด format ด้วย Prettier
- Config ทั้งหมดอยู่ใน `packages/config` ทุก app ต้อง extend จากที่นี่

### 4.2 เงิน เวลา และ ID (กฎที่พลาดบ่อยที่สุด)

- **เงิน: ต้อง** เก็บเป็นจำนวนเต็มในหน่วย**สตางค์** (`Int` / `BigInt`) — **ห้าม** คำนวณเงินด้วย float
- **หน่วยมิเตอร์ / ปริมาณ:** ใช้ `Decimal` ของ Prisma ไม่ใช่ float
- **เวลา: ต้อง** เก็บเป็น `timestamptz` (UTC) แล้วแปลงเป็น `Asia/Bangkok` ตอนแสดงผลเท่านั้น ปี พ.ศ. ใช้ตอนแสดงผลเท่านั้น ห้ามเก็บลง DB
- **วันที่ไม่มีเวลา** (เช่น วันครบกำหนดชำระ) ใช้ type `date`
- **ID: ต้อง** ใช้ UUIDv7 สำหรับ ID ที่โผล่ใน URL หรือ API — **ห้าม** เปิดเผย auto-increment ID เพราะเดาได้และเสี่ยง IDOR
- **เลขเอกสาร** (เลขใบแจ้งหนี้ / ใบเสร็จ) แยกเป็นคอลัมน์ต่างหาก และรันเลขต่อเนื่องด้วย sequence ภายใน transaction

### 4.3 Error handling

- Server Action **ต้อง** คืนค่าเป็น typed result: `{ ok: true, data } | { ok: false, code, message }` ห้ามโยน error ดิบไปฝั่ง client
- Error ที่ไม่คาดคิด **ต้อง** log และส่งเข้า Sentry แล้วแสดงข้อความกลาง ๆ ให้ผู้ใช้ — ห้ามเปิดเผย stack trace หรือ SQL
- ทุก error code ต้องมีข้อความภาษาไทยใน i18n messages
- Route Handler (REST) ส่ง error ตามรูปแบบ RFC 9457 (Problem Details)

### 4.4 อื่น ๆ

- ฟังก์ชันที่ export จาก `packages/*` **ต้อง** มี JSDoc สั้น ๆ
- Comment อธิบายว่า "ทำไม" ไม่ใช่ "ทำอะไร"
- **ห้าม** commit โค้ดที่ comment ทิ้งไว้ หรือ `console.log` (ให้ใช้ logger)
- งานที่ยังไม่เสร็จแต่ต้อง merge **ควร** ซ่อนไว้หลัง feature flag

---

## 5. Database

- แต่ละ app **ต้อง** มี database ของตัวเอง และแยกตาม environment (dev / staging / production)
- **ต้อง** เปลี่ยน schema ผ่าน `prisma migrate` เท่านั้น — **ห้าม** แก้ schema production ด้วยมือ
- Migration ที่ลบหรือเปลี่ยนชื่อคอลัมน์ **ต้อง** ทำแบบ expand → ย้ายข้อมูล → contract (แยกอย่างน้อย 2 release) เพื่อ deploy ได้โดยไม่มี downtime
- **ต้อง** ใช้ constraint ที่ระดับ DB (FK, unique, check, exclusion) ไม่พึ่ง validation ในโค้ดอย่างเดียว เช่น กันจองคลาสซ้อนหรือจองห้องซ้อน
- การเขียนข้อมูลหลายตาราง **ต้อง** อยู่ใน transaction เดียว (เช่น สร้างใบแจ้งหนี้ + รายการย่อย + enqueue แจ้งเตือน)
- ตาราง business **ต้อง** มี `id`, `created_at`, `updated_at` ข้อมูลสำคัญใช้ soft delete (`deleted_at`) คู่กับ audit log
- **ควร** สร้าง index ตาม query ที่ใช้จริง ตรวจ query ช้าด้วย `EXPLAIN ANALYZE` และระวัง N+1
- App **ต้อง** ต่อ DB ด้วย user สิทธิ์ต่ำ (CRUD เท่านั้น) ส่วน user สำหรับรัน migration แยกต่างหาก
- **ต้อง** ใช้ connection pooling (PgBouncer หรือ pooler ของผู้ให้บริการ)
- Seed **ต้อง** เป็นข้อมูลปลอม (faker) — **ห้าม** copy ข้อมูล production มาใช้ใน dev/staging
- ระบบที่มีหลายองค์กรในระบบเดียว (multi-tenant เช่น SaaS ที่ให้หอพักหลายแห่งใช้) **ต้อง** มี `org_id` ทุกตาราง และ **ควร** เปิด Row-Level Security ของ Postgres เป็นชั้นป้องกันที่สอง

---

## 6. Server Actions & API

### 6.1 ลำดับที่ทุก entrypoint ต้องทำ

ทุก Server Action และ Route Handler **ต้อง** ทำตามลำดับนี้โดยไม่มีข้อยกเว้น:

1. **Authenticate** — มี session ที่ถูกต้องหรือไม่
2. **Validate** — parse input ด้วย Zod
3. **Authorize** — ตรวจ role และ ownership ผ่าน DAL
4. **Execute** — เรียก service
5. **Audit** — บันทึก audit log ถ้าเป็น action สำคัญ (§12.4)

```ts
// features/billing/actions.ts
'use server';

export async function markInvoicePaid(input: unknown): Promise<ActionResult<InvoiceDto>> {
  // 1. Authenticate
  const session = await requireSession();

  // 2. Validate
  const parsed = MarkInvoicePaidSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error);

  // 3. Authorize — DAL ตรวจทั้ง permission และ ownership แล้วคืนเฉพาะข้อมูลที่มีสิทธิ์
  const invoice = await dal.invoices.getForUpdate(session, parsed.data.invoiceId);
  if (!invoice) return fail('NOT_FOUND'); // ไม่แยกว่า "ไม่มี" หรือ "ไม่มีสิทธิ์" เพื่อไม่ให้เดา ID ได้

  // 4. Execute
  const updated = await billingService.markPaid(invoice, parsed.data);

  // 5. Audit
  await audit(session, 'invoice.mark_paid', { entity: invoice, before: invoice, after: updated });

  return ok(toInvoiceDto(updated));
}
```

`requireSession`, `ok`, `fail` และ `audit` เป็น helper กลางจาก `packages/auth` และ `packages/security`

### 6.2 กฎเพิ่มเติม

- **Server Action ทุกตัวคือ public HTTP endpoint** — ถูกเรียกจากภายนอกได้แม้ไม่มีปุ่มในหน้าเว็บ
- **ห้าม** ใช้ middleware/proxy เป็นด่านตรวจสิทธิ์ด่านเดียว (ใช้แค่ redirect เพื่อ UX) — Next.js เคยมีช่องโหว่ middleware bypass (CVE-2025-29927)
- **ห้าม** รับราคาหรือยอดเงินจาก client — คำนวณฝั่ง server เสมอ
- ส่งให้ client component เฉพาะ DTO ที่จำเป็น — **ห้าม** ส่ง Prisma object ทั้งก้อน (field ลับอาจหลุด)
- ใช้ Server Actions สำหรับ mutation ภายในเว็บ และใช้ Route Handler สำหรับ webhook, health check และ API ที่ให้ระบบภายนอกเรียก
- API ที่เปิดให้ภายนอก **ต้อง** มี version (`/api/v1/...`) ใช้ pagination แบบ cursor และมี limit สูงสุด (เช่น 100 รายการ)
- **Webhook** (Omise, LINE ฯลฯ) **ต้อง**: ตรวจ signature → บันทึก event ID กันประมวลผลซ้ำ (idempotency) → ตอบ 2xx ให้เร็ว แล้วประมวลผลต่อใน background job

---

## 7. Testing

### 7.1 ระดับของ test และเครื่องมือ

| ระดับ | เครื่องมือ | ไฟล์ | ทดสอบอะไร | รันเมื่อ |
|---|---|---|---|---|
| Unit | Vitest | `*.test.ts` (วางข้างไฟล์ที่ทดสอบ) | service, utils, Zod schema | ทุก PR |
| Component | Vitest + Testing Library | `*.test.tsx` | ฟอร์ม, component ที่มี logic | ทุก PR |
| Integration | Vitest + Testcontainers (Postgres จริง) | `tests/integration/*.int.test.ts` | DAL, query, constraint, transaction, สิทธิ์ | ทุก PR |
| E2E | Playwright (รันบน production build) | `e2e/*.spec.ts` | flow สำคัญตั้งแต่ต้นจนจบ | ทุก PR (critical) / nightly (ทั้งหมด) |
| Accessibility | @axe-core/playwright | อยู่ใน E2E | หน้าหลักทุกหน้า | ทุก PR |
| Load | k6 | `load/*.js` | endpoint ที่โหลดสูง | ก่อน release ใหญ่ |
| DAST | ZAP baseline scan | CI | staging | ทุกครั้งที่ deploy staging |

Service ภายนอก (Omise, LINE, ระบบตรวจสลิป) ใน test ให้ mock ด้วย **MSW**

### 7.2 สิ่งที่บังคับต้องมี test

1. **การคำนวณทุกอย่างที่เกี่ยวกับเงินและวันที่** — unit test ครอบคลุม edge case (สิ้นเดือน, ปีอธิกสุรทิน, เข้าพักกลางเดือน, การปัดเศษ)
2. **Authorization ของทุก resource** — integration test ว่า:
   - role ที่ไม่มีสิทธิ์ถูกปฏิเสธ
   - ผู้ใช้ A เข้าถึงข้อมูลของผู้ใช้ B ไม่ได้ (IDOR)
3. **Critical user journeys** — E2E: login (+2FA), flow หลักของโปรเจกต์, การชำระเงิน
4. **ทุก bug ที่แก้** ต้องมี regression test ที่ fail ก่อนแก้
5. **Webhook** — signature ผิดต้องถูกปฏิเสธ และ event ซ้ำต้องไม่ถูกประมวลผลซ้ำ

### 7.3 Coverage

- `features/**/service.ts`, `server/dal/**` และ `packages/**` **ต้อง** มี coverage ≥ 80% (lines และ branches) — CI fail ถ้าต่ำกว่า
- ส่วนอื่นไม่บังคับตัวเลข ให้วัดคุณภาพจาก §7.2 แทน
- **ห้าม** เขียน test เพื่อไล่ตัวเลข coverage โดยไม่มี assertion ที่มีความหมาย

### 7.4 กฎการเขียน test

- Test **ต้อง** อิสระต่อกัน รันลำดับไหนก็ผ่าน และรันขนานกันได้
- **ต้อง** deterministic: ใช้ fake timers กับเวลา, fix timezone และไม่มี sleep แบบเดาเวลา
- **ห้าม** เรียก service ภายนอกจริงใน test
- สร้างข้อมูลด้วย factory จาก `packages/testing` ไม่ hard-code ข้อมูลซ้ำ ๆ
- E2E **ควร** หา element ด้วย role/label (`getByRole`, `getByLabel`) ก่อนใช้ `data-testid`
- Test ที่ flaky **ต้อง** แก้หรือ quarantine ภายใน 1 สัปดาห์ ห้ามปล่อยให้ retry ไปเรื่อย ๆ
- ตั้งชื่อ test เป็นพฤติกรรม เช่น `it('ปฏิเสธการเช็กอินเมื่อสมาชิกหมดอายุ')`

### 7.5 เกณฑ์ Load test เริ่มต้น

ปรับตัวเลขได้ต่อโปรเจกต์ใน `docs/ARCHITECTURE.md`

- ทดสอบที่โหลด 2 เท่าของที่คาดการณ์
- API อ่านข้อมูล p95 ≤ 300 ms, API เขียนข้อมูล p95 ≤ 800 ms
- Error rate < 1%

---

## 8. Git Workflow & Code Review

### 8.1 Branching

- ใช้ **trunk-based**: `main` ต้อง deploy ได้เสมอ และ branch ควรมีอายุสั้น (≤ 3 วัน)
- ชื่อ branch: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`, `hotfix/…`
- PR **ควร** เล็ก (แนะนำไม่เกิน 400 บรรทัดที่เปลี่ยน ไม่นับ lockfile และไฟล์ที่ generate)

### 8.2 Commit

- **ต้อง** ใช้ Conventional Commits และตรวจด้วย commitlint เช่น `feat(dormitory): add meter reading form`
- scope คือชื่อ app หรือ package
- **ควร** sign commit (SSH หรือ GPG)

### 8.3 Branch protection ของ `main`

- ห้าม push ตรง และห้าม force push
- ต้องผ่าน required checks ทั้งหมดใน §9.1
- ต้องได้ approve อย่างน้อย 1 คน และ **2 คน** (หรือ CODEOWNER) สำหรับ `packages/auth`, `packages/security`, `prisma/migrations`, workflow ของ CI และโค้ดที่เกี่ยวกับเงิน
- Branch ต้อง up-to-date กับ `main` ก่อน merge และใช้ squash merge

### 8.4 Checklist สำหรับ Reviewer

- [ ] ทุก entrypoint ทำครบ authenticate → validate → authorize → execute → audit
- [ ] ไม่มี secret, PII หรือ token ในโค้ด, log หรือ test fixture
- [ ] เงินเก็บเป็นสตางค์ (integer) และเวลาเป็น UTC
- [ ] Migration เป็นแบบ expand-contract และย้อนกลับได้
- [ ] มี test ตาม §7.2
- [ ] ข้อความที่ผู้ใช้เห็นอยู่ใน i18n และใช้ภาษาไทยถูกต้อง
- [ ] Dependency ใหม่ผ่านเกณฑ์ §2.4
- [ ] UI ผ่านกฎ responsive §15.2 (ไม่มี scroll แนวนอนที่ 320px, พื้นที่แตะ ≥ 44px, ไม่มีฟังก์ชันที่ต้อง hover) และผ่าน a11y check

### 8.5 Release

- Deploy production จาก `main` ผ่าน pipeline เท่านั้น
- **ควร** ใช้ release-please สร้าง CHANGELOG และ tag แยกต่อ app (เช่น `fitness-v1.4.0`) จาก Conventional Commits

---

## 9. CI/CD & Deployment

### 9.1 Pipeline

```
Pull Request
  ├─ install (frozen lockfile + cache)
  ├─ lint + format check + typecheck
  ├─ unit + component tests (+ coverage gate)
  ├─ integration tests (Testcontainers)
  ├─ build Docker image
  ├─ E2E + a11y (Playwright บน image ที่ build)
  └─ security: gitleaks · SAST · dependency audit · license check · Trivy
        │  ผ่านทุกขั้น + ได้ review → squash merge เข้า main
        ▼
main
  ├─ build & push image (tag = git SHA) + SBOM
  ├─ deploy staging (รัน migration ก่อน) → smoke test → ZAP baseline
  └─ manual approval → deploy production (image เดียวกัน) → smoke test → แจ้งทีม
```

- Turborepo **ต้อง** รันเฉพาะ app/package ที่ได้รับผลกระทบ (`turbo run <task> --affected`)
- เป้าเวลาของ PR pipeline: ไม่เกิน 15 นาที

### 9.2 Environments

| Env | ใช้ทำอะไร | ข้อมูล | Deploy |
|---|---|---|---|
| local | พัฒนา | seed ปลอม | developer |
| preview (อาจมี) | review PR | seed ปลอม | อัตโนมัติต่อ PR |
| staging | ทดสอบก่อนขึ้นจริง, ZAP scan | seed ปลอม หรือข้อมูลที่ anonymize แล้ว | อัตโนมัติเมื่อ merge |
| production | ใช้งานจริง | ข้อมูลจริง | manual approval |

- แต่ละ environment **ต้อง** มี DB, secrets, bucket และ Sentry environment แยกกัน
- **ห้าม** ใช้ secret ของ production ใน environment อื่น

### 9.3 Deployment

- **Build once, deploy many:** ใช้ image เดียวกัน (tag ด้วย git SHA) ทั้ง staging และ production ความต่างของแต่ละ env มาจาก env var เท่านั้น
- Migration รันเป็น step แยก **ก่อน** deploy app และต้องทำงานร่วมกับ app เวอร์ชันก่อนหน้าได้
- **ต้อง** มี `/api/health` (liveness) และ `/api/ready` (readiness — ตรวจ DB และ Redis)
- **ต้อง** deploy แบบ zero-downtime (rolling หรือ blue-green) และ rollback ได้ภายใน 5 นาทีโดย deploy image ก่อนหน้า
- Background worker (pg-boss) deploy เป็น process/container แยกจาก web

### 9.4 ความปลอดภัยของ CI

- GitHub Actions **ต้อง** pin ด้วย commit SHA เต็ม (ไม่ใช้ `@v4`)
- ทุก workflow ตั้ง `permissions:` ให้น้อยที่สุด (ค่าเริ่มต้น `contents: read`)
- ใช้ OIDC เชื่อมต่อ cloud แทน long-lived key เมื่อทำได้
- **ห้าม** ให้ workflow ที่มาจาก PR ของ fork เข้าถึง secrets (ใช้ `pull_request_target` ได้เฉพาะหลังผ่าน review)
- การ deploy production ต้องผ่าน GitHub Environment ที่ตั้ง required reviewers

---

## 10. Security

เป้าหมายคือผ่าน OWASP Top 10 และ OWASP ASVS ระดับ 2

### 10.1 Authentication

- ใช้ Better Auth เท่านั้น — **ห้าม** เขียนระบบ auth หรือ crypto เอง
- รหัสผ่าน:
  - ยาวอย่างน้อย 12 ตัวอักษร ไม่บังคับผสมอักขระ และไม่บังคับเปลี่ยนตามรอบ (ตามแนวทาง NIST SP 800-63B)
  - **ต้อง** ตรวจกับรายการรหัสผ่านที่เคยรั่ว (HIBP)
- **2FA (TOTP หรือ passkey) บังคับ**สำหรับพนักงานและ admin ทุกระดับ ส่วนผู้ใช้ทั่วไปเปิดได้ตามสมัครใจ
- Session:
  - cookie ตั้ง `HttpOnly`, `Secure`, `SameSite=Lax` และ **ควร** ใช้ prefix `__Host-`
  - admin/staff: idle timeout 30 นาที, absolute timeout 12 ชั่วโมง
  - ผู้ใช้ทั่วไป: อายุสูงสุด 30 วัน
  - สร้าง session ใหม่หลัง login หรือเปลี่ยนสิทธิ์ และ logout ต้อง revoke session ฝั่ง server
- มี rate limit และหน่วงเวลาเพิ่มขึ้นเรื่อย ๆ ที่ login, OTP และ reset password
- ข้อความ error ตอน login/reset **ห้าม** บอกว่าอีเมลนั้นมีในระบบหรือไม่
- Token สำหรับ reset password และยืนยันอีเมลใช้ได้ครั้งเดียวและหมดอายุภายใน 30 นาที
- Action ที่อ่อนไหว (เปลี่ยนอีเมล/รหัสผ่าน, ลบข้อมูลจำนวนมาก, export ข้อมูลส่วนบุคคล) **ต้อง** ยืนยันตัวตนซ้ำ (step-up)

### 10.2 Authorization

- **Deny by default** — อะไรที่ไม่ได้อนุญาตไว้ชัดเจนถือว่าห้าม
- ใช้ RBAC (role → permission) ผ่าน access control ของ Better Auth และ**ตรวจ ownership** ใน DAL ทุก query
- ทุกโปรเจกต์ **ต้อง** มี `docs/RBAC.md` (permission matrix) และมี test ครบทุกช่องใน matrix
- ตรวจสิทธิ์ฝั่ง server เสมอ — การซ่อนปุ่มใน UI ไม่ถือว่าเป็นการป้องกัน
- Admin เปลี่ยน role ของตัวเองไม่ได้ และการให้สิทธิ์ admin ต้องบันทึก audit log

### 10.3 Input, Output & Injection

- Validate **ทุก** input ด้วย Zod (body, query, params, header ที่ใช้งาน และข้อมูลจาก webhook)
- **ห้าม** ใช้ `$queryRawUnsafe` หรือต่อ string เป็น SQL ถ้าจำเป็นต้องใช้ raw SQL ให้ใช้ tagged template `$queryRaw`
- **ห้าม** ใช้ `dangerouslySetInnerHTML` เว้นแต่ sanitize ด้วย DOMPurify แล้ว (เช่น rich text รายละเอียดทรัพย์)
- การ fetch URL ที่ผู้ใช้ส่งมา **ต้อง** มี allowlist ของ domain (ป้องกัน SSRF)
- Redirect หลัง login ต้องเป็น path ภายในเว็บเท่านั้น (ป้องกัน open redirect)

### 10.4 เฉพาะ Next.js

- ไฟล์ฝั่ง server ต้องมี `import 'server-only'`
- Env var ที่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะถูกฝังลงใน JS ที่ browser โหลด — **ห้าม** ใส่ secret
- Server Action คือ public endpoint (§6.2)
- ส่งเฉพาะ DTO ให้ client component
- ติดตาม security advisory ของ Next.js และ React — ช่องโหว่ระดับ Critical ต้อง patch ภายใน 48 ชั่วโมง

### 10.5 HTTP Security Headers

ค่าเริ่มต้นเก็บไว้ใน `packages/security` แต่ละโปรเจกต์เพิ่ม domain ที่จำเป็นเองได้

| Header | ค่า |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'nonce-{random}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: <storage-domain>; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | ปิดทุกอย่างที่ไม่ใช้ เช่น `camera=(), microphone=(), geolocation=()` — Fitness เปิด `camera=(self)` สำหรับสแกน QR และ Real Estate เปิด `geolocation=(self)` สำหรับค้นหาใกล้ฉัน |
| X-Frame-Options | `DENY` (สำรองสำหรับ browser รุ่นเก่า) |

- หมายเหตุ: CSP แบบ nonce บังคับให้หน้าเป็น dynamic rendering ส่วนหน้า public ที่เป็น static (เพื่อ SEO) ให้ใช้ CSP แบบ allowlist/hash ที่เข้มงวดแทน
- **ต้อง** ได้เกรด A ขึ้นไปจาก securityheaders.com (หรือเครื่องมือที่เทียบเท่า) ก่อนขึ้น production

### 10.6 Rate limiting & Bot protection

| Endpoint | ค่าเริ่มต้น |
|---|---|
| Login / 2FA | 5 ครั้งต่อนาที ต่อ IP + บัญชี และล็อกชั่วคราวแบบเพิ่มเวลาขึ้นเรื่อย ๆ |
| Reset password / ส่ง OTP | 3 ครั้งต่อ 15 นาที ต่อบัญชี |
| ฟอร์มสาธารณะ (ติดต่อ, สอบถามทรัพย์) | 10 ครั้งต่อชั่วโมง ต่อ IP + Cloudflare Turnstile |
| อัปโหลดไฟล์ | 30 ไฟล์ต่อชั่วโมง ต่อผู้ใช้ |
| API ค้นหาสาธารณะ | 60 ครั้งต่อนาที ต่อ IP |
| API ทั่วไป (login แล้ว) | 300 ครั้งต่อนาที ต่อผู้ใช้ |

- Production **ควร** อยู่หลัง Cloudflare (WAF + DDoS protection)
- เมื่อเกิน limit ให้ตอบ `429` พร้อม header `Retry-After`

### 10.7 File Upload

- ใช้ allowlist ชนิดไฟล์และตรวจ magic bytes (ไม่เชื่อนามสกุลหรือ Content-Type)
- จำกัดขนาด (ค่าเริ่มต้น: รูปไม่เกิน 10 MB, PDF ไม่เกิน 20 MB)
- รูปภาพ **ต้อง** re-encode ด้วย sharp เพื่อลบ EXIF/GPS และ payload ที่แฝงมา
- ตั้งชื่อไฟล์ใหม่เป็น UUID — **ห้าม** ใช้ชื่อไฟล์จากผู้ใช้เป็น path
- Bucket เป็น **private** เป็นค่าเริ่มต้น เปิดดูผ่าน signed URL อายุไม่เกิน 15 นาที เฉพาะไฟล์ที่ตั้งใจเผยแพร่ (เช่น รูปประกาศทรัพย์) อยู่ใน public bucket ที่แยกไว้
- ไฟล์เอกสาร (PDF/Office) **ควร** สแกนไวรัส (ClamAV) ก่อนเปิดให้ดาวน์โหลด
- อัปโหลดตรงไป storage ด้วย presigned URL แล้วให้ server ตรวจไฟล์ก่อนเปลี่ยนสถานะเป็นใช้งานได้

### 10.8 Secrets

- เก็บใน secret manager (Infisical) — **ห้าม** commit `.env` ให้ commit แค่ `.env.example` ที่เป็นค่าปลอม
- รัน gitleaks ทั้งตอน pre-commit และใน CI
- Secret แยกตาม environment หมุน (rotate) ทันทีเมื่อสงสัยว่ารั่วหรือมีคนออกจากทีม และหมุน key สำคัญอย่างน้อยปีละครั้ง
- **ห้าม** ส่ง secret ผ่านแชทหรืออีเมล
- Env var ทุกตัว **ต้อง** validate ด้วย Zod ตอน app start (fail fast)

### 10.9 Cryptography & ข้อมูลอ่อนไหว

- ใช้ TLS 1.2 ขึ้นไปทุกการเชื่อมต่อ รวมถึง app ↔ DB
- ข้อมูลระดับ Restricted (§11.1) **ต้อง** เข้ารหัสระดับ field ด้วย AES-256-GCM:
  - key เก็บใน secret manager และมี key version เพื่อให้ rotate ได้
  - ถ้าต้องค้นหาด้วย field นั้น (เช่น ค้นจากเลขบัตรประชาชน) ใช้ blind index (HMAC-SHA256 คนละ key)
- แสดงผลแบบ mask เป็นค่าเริ่มต้น เช่น `1-2345-XXXXX-XX-X` การกดดูแบบเต็มต้องมีสิทธิ์และบันทึก audit log
- การ hash รหัสผ่านให้ Better Auth จัดการ — **ห้าม** ทำเอง

### 10.10 การชำระเงิน

- **ห้าม** ให้ข้อมูลบัตรผ่าน server ของเรา ให้ใช้ฟอร์มหรือหน้าชำระเงินของ Omise (tokenization) เพื่อลดขอบเขต PCI DSS
- ยอดเงินต้องคำนวณฝั่ง server เสมอ
- ทุกคำขอชำระเงินต้องมี idempotency key
- Webhook ต้องตรวจ signature และกันซ้ำ (§6.2) และ**เรียก API ของ Omise ตรวจสถานะซ้ำ**ก่อนเปลี่ยนสถานะเป็นชำระแล้ว
- สลิปโอนเงิน: ตรวจผ่าน API ตรวจสลิป และกันสลิปซ้ำโดยเก็บ transaction ref เป็น unique
- กระทบยอด (reconcile) กับ payment provider ทุกวันด้วย job อัตโนมัติ

### 10.11 Supply Chain

- ทำตาม §2.3 (lockfile, `minimumReleaseAge`, allowlist ของ scripts, Renovate)
- รัน `pnpm audit --audit-level=high` ใน CI — fail เมื่อพบ High/Critical
- ตรวจ license ใน CI
- **ควร** ใช้ Socket.dev ตรวจ package ที่มีพฤติกรรมน่าสงสัย
- สร้าง SBOM (CycloneDX) ทุก release และเก็บไว้คู่กับ image

### 10.12 Container & Infrastructure

- Base image ขนาดเล็ก (distroless หรือ `node:24-alpine`) ใช้ multi-stage build และรันด้วย user ที่ไม่ใช่ root
- สแกน image ด้วย Trivy — fail เมื่อพบ Critical ที่มี fix แล้ว
- DB และ Redis **ห้าม** เปิด public ต้องเข้าถึงผ่าน private network เท่านั้น
- Server: login SSH ด้วย key เท่านั้น (ปิด password), firewall เปิดเฉพาะ 80/443 และเปิด automatic security updates
- หน้า admin ของ infra (Coolify, DB console) ต้องอยู่หลัง VPN หรือ Cloudflare Access และใช้ 2FA

### 10.13 สรุป Security Scanning

| เครื่องมือ | ตรวจอะไร | เมื่อไร | Block merge? |
|---|---|---|---|
| gitleaks | secret ในโค้ด | pre-commit + PR | ✅ |
| Semgrep (หรือ CodeQL ถ้ามี license GitHub Code Security) | SAST | PR | ✅ (High ขึ้นไป) |
| pnpm audit | CVE ของ dependency | PR + รายวัน | ✅ (High ขึ้นไป) |
| License checker | license ต้องห้าม | PR | ✅ |
| Trivy | CVE ของ image + SBOM | ตอน build | ✅ (Critical) |
| ZAP baseline | DAST | ทุกครั้งที่ deploy staging | ⚠️ แจ้งเตือน |
| Pentest จากภายนอก | ทั้งระบบ | ก่อน go-live และปีละครั้ง | — |

หมายเหตุ: CodeQL ใช้ฟรีเฉพาะ public repo ถ้า repo เป็น private ต้องมี license GitHub Code Security มิฉะนั้นใช้ Semgrep

### 10.14 SLA การแก้ช่องโหว่

| ระดับ | ต้องแก้ภายใน |
|---|---|
| Critical | 48 ชั่วโมง |
| High | 7 วัน |
| Medium | 30 วัน |
| Low | 90 วัน หรือยอมรับความเสี่ยงพร้อมบันทึกเหตุผล |

---

## 11. PDPA & ข้อมูลส่วนบุคคล

> ⚠️ ส่วนนี้เป็นแนวทางทางเทคนิค ไม่ใช่คำแนะนำทางกฎหมาย ควรให้ที่ปรึกษากฎหมายตรวจ privacy notice และนโยบายก่อนใช้งานจริง

### 11.1 การจัดระดับข้อมูล (Data Classification)

| ระดับ | ตัวอย่าง | การจัดการ |
|---|---|---|
| Public | ประกาศทรัพย์, ตารางคลาส, ราคาแพ็กเกจ | เผยแพร่ได้ |
| Internal | รายงานรายได้, การตั้งค่าระบบ | เฉพาะพนักงานที่มีสิทธิ์ |
| Confidential (PII) | ชื่อ, เบอร์โทร, อีเมล, ที่อยู่, ประวัติการชำระเงิน | ตรวจสิทธิ์ + ownership, ไม่เขียนลง log, mask ใน export |
| Restricted | เลขบัตรประชาชนและรูปบัตร, ข้อมูลสุขภาพ, ข้อมูลชีวมิติ, เลขบัญชีธนาคาร | ทุกข้อของ Confidential + เข้ารหัสระดับ field + private bucket + audit ทุกการเข้าถึง + mask เป็นค่าเริ่มต้น |

ทุกโปรเจกต์ **ต้อง** มี `docs/DATA-CLASSIFICATION.md` ที่ระบุทุก field ที่เป็น PII พร้อมระดับและระยะเวลาเก็บ

### 11.2 ข้อมูลอ่อนไหวตาม PDPA มาตรา 26

- ข้อมูลสุขภาพ (เช่น โรคประจำตัวของสมาชิกฟิตเนส) และ**ข้อมูลชีวมิติ** (สแกนหน้าหรือลายนิ้วมือเพื่อเช็กอิน) เป็นข้อมูลอ่อนไหว **ต้อง** ขอความยินยอมโดยชัดแจ้งและแยกจาก consent อื่น
- **ควร** หลีกเลี่ยงการเก็บข้อมูลชีวมิติ ถ้าใช้ QR code หรือบัตรสมาชิกแทนได้

### 11.3 ข้อกำหนดทางเทคนิค

- **Data minimization:** เก็บเฉพาะ field ที่มีวัตถุประสงค์ชัดเจน
- **Consent:** แยกตามวัตถุประสงค์ (ไม่มัดรวม) บันทึก consent log (ผู้ใช้, วัตถุประสงค์, เวอร์ชันของ privacy notice, เวลา, ช่องทาง) และถอน consent ได้ง่ายเท่ากับตอนให้
- **Privacy notice:** ทุกโปรเจกต์มีหน้า privacy notice และแจ้งผู้ใช้ก่อนหรือขณะเก็บข้อมูล
- **Cookie:** cookie ที่ไม่จำเป็น (analytics/marketing) ต้องได้ consent ก่อน analytics **ควร** เป็นแบบ privacy-friendly ที่ self-host ได้ (เช่น Umami)
- **สิทธิ์ของเจ้าของข้อมูล:** ระบบ **ต้อง** รองรับการขอดู/export, แก้ไข, ลบหรือทำให้ไม่ระบุตัวตน และถอน consent โดยตอบคำขอภายใน 30 วัน
- **Retention:** ข้อมูลทุกประเภทต้องมีระยะเวลาเก็บ และมี job ลบหรือ anonymize อัตโนมัติเมื่อครบกำหนด ข้อมูลที่กฎหมายบัญชี/ภาษีบังคับให้เก็บ (เช่น ใบเสร็จ) ให้เก็บตามระยะที่กฎหมายกำหนด (ยืนยันกับนักบัญชี)
- **Processors:** ทำรายการผู้ประมวลผลข้อมูลภายนอก (Omise, LINE, Sentry, Cloudflare, ผู้ให้บริการอีเมล) พร้อมระบุข้อมูลที่ส่งให้ และตรวจว่ามีข้อตกลงการประมวลผลข้อมูล (DPA)
- **ROPA:** บันทึกรายการกิจกรรมการประมวลผลข้อมูล (Record of Processing Activities)
- **Data breach:** ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ภายใน 72 ชั่วโมงหลังทราบเหตุ (เว้นแต่ไม่มีความเสี่ยงต่อสิทธิของเจ้าของข้อมูล) และแจ้งเจ้าของข้อมูลถ้ามีความเสี่ยงสูง — ดูขั้นตอนใน §20

---

## 12. Observability & Audit Log

### 12.1 Logging

- ใช้ Pino เขียน log แบบ JSON โดยมี level `error`, `warn`, `info`, `debug` (ปิด debug ใน production)
- ทุก request มี `requestId` (correlation ID) ส่งต่อไปถึง background job และ service ปลายทาง
- **ห้าม** log: รหัสผ่าน, token, cookie, ข้อมูล Restricted หรือ body ของฟอร์มทั้งก้อน ให้ตั้ง `redact` ของ Pino ไว้ที่ส่วนกลาง
- เก็บ log อย่างน้อย 90 วัน

### 12.2 Error tracking

- ติดตั้ง Sentry ทุก app (client + server + worker) แยกตาม environment และผูก release กับ git SHA
- ตั้ง `sendDefaultPii: false` และ scrub ข้อมูลส่วนบุคคล
- Upload source maps ไปที่ Sentry แต่ **ห้าม** เปิด source maps ให้ public เข้าถึง

### 12.3 Metrics, Uptime & Alerting

- **ควร** ใช้ OpenTelemetry สำหรับ tracing/metrics เมื่อระบบเริ่มโต
- ใช้ uptime monitor (เช่น Uptime Kuma) ตรวจ `/api/health` ทุก 1 นาที
- แจ้งเตือนเข้า LINE/Slack/อีเมลของทีมเมื่อ: เว็บล่ม, error rate พุ่ง, job ล้มเหลวซ้ำ, backup ล้มเหลว หรือ TLS certificate ใกล้หมดอายุ
- **SLO เริ่มต้น:** availability ≥ 99.5% ต่อเดือน

### 12.4 Audit Log

- ตาราง `audit_logs` เป็นแบบ **append-only** (DB user ของ app ไม่มีสิทธิ์ `UPDATE` / `DELETE`)
- Field: `id, occurred_at, actor_id, actor_role, action, entity_type, entity_id, changes (before/after — mask ข้อมูล Restricted), ip, user_agent, request_id`
- **ต้อง** บันทึกเหตุการณ์เหล่านี้:
  - login สำเร็จและล้มเหลว
  - เปลี่ยนสิทธิ์หรือ role
  - สร้าง แก้ หรือยกเลิกรายการที่เกี่ยวกับเงิน
  - เปลี่ยนราคาหรืออัตราค่าบริการ
  - ลบข้อมูล
  - export ข้อมูลส่วนบุคคล
  - ดูข้อมูล Restricted แบบไม่ mask
  - เปลี่ยนการตั้งค่าระบบ
- เก็บอย่างน้อย 1 ปี (หรือตามที่กฎหมายกำหนด) และมีหน้าค้นหา audit log ให้ admin

---

## 13. Backup & Disaster Recovery

| รายการ | มาตรฐาน |
|---|---|
| DB backup | อัตโนมัติรายวัน + Point-in-Time Recovery (PITR) |
| ระยะเก็บ | backup รายวันอย่างน้อย 30 วัน, รายเดือนอย่างน้อย 12 เดือน |
| สำเนานอกสถานที่ | อย่างน้อย 1 ชุดอยู่คนละผู้ให้บริการหรือคนละ region (กฎ 3-2-1) |
| การเข้ารหัส | ทุก backup ต้องเข้ารหัส |
| File storage | เปิด versioning สำหรับ bucket ที่สำคัญ |
| RPO | ≤ 15 นาที (ด้วย PITR) |
| RTO | ≤ 4 ชั่วโมง |
| ซ้อม restore | **ทุกไตรมาส** — restore ลง environment แยกแล้วตรวจข้อมูล บันทึกผลไว้ใน runbook |

**ต้อง** มี runbook `docs/runbooks/restore.md` ที่คนอื่นทำตามได้โดยไม่ต้องถามคนเขียน

---

## 14. Performance

- **Core Web Vitals** ของหน้า public (วัดที่ p75): LCP ≤ 2.5 วินาที, INP ≤ 200 ms, CLS ≤ 0.1
- **ควร** รัน Lighthouse CI กับหน้า public ที่สำคัญ (เป้า Performance ≥ 90)
- รูปภาพใช้ `next/image` (หลายขนาด, AVIF/WebP, lazy load)
- ฟอนต์ใช้ `next/font` (self-host, ไม่เกิด layout shift)
- ใช้ Server Components เป็นค่าเริ่มต้น ใส่ `'use client'` เฉพาะส่วนที่ต้อง interactive
- กำหนด caching strategy ของแต่ละหน้า (static / ISR / dynamic) ไว้ใน `docs/ARCHITECTURE.md`
- ระวัง N+1 query ทุก list ต้องมี pagination และห้ามดึงข้อมูลแบบไม่จำกัดจำนวน
- งานหนัก (สร้าง PDF รายเดือน, ส่งแจ้งเตือนจำนวนมาก) **ต้อง** ทำใน background job

---

## 15. UX, Responsive, Accessibility & ภาษาไทย

### 15.1 หลักทั่วไป

- **Mobile-first** — ผู้ใช้ปลายทาง (สมาชิก, ผู้เช่า, คนหาบ้าน) ส่วนใหญ่ใช้มือถือ และหลังบ้านต้องใช้บน tablet ได้ (กฎละเอียดอยู่ใน §15.2)
- **Accessibility:** เป้าหมาย WCAG 2.2 ระดับ AA
  - `<html lang="th">`, ทุก input มี label, ใช้งานด้วย keyboard ได้ และมองเห็น focus ชัดเจน
  - contrast ของตัวอักษรอย่างน้อย 4.5:1 และไม่สื่อความหมายด้วยสีอย่างเดียว
  - axe ต้องไม่พบ violation ระดับ serious/critical
- **Design system:** ใช้ component และ design token จาก `packages/ui` — ห้ามสร้างปุ่มหรือฟอร์มซ้ำในแต่ละ app
- **ภาษาไทย:**
  - ข้อความ UI ทั้งหมดอยู่ใน message file ของ next-intl ห้าม hard-code
  - วันที่แสดงเป็น พ.ศ., เงินแสดงเป็น `฿1,234.00`, เบอร์โทรใช้รูปแบบ `08X-XXX-XXXX`
  - ข้อความ error ต้องบอกวิธีแก้ ไม่ใช่แค่ "เกิดข้อผิดพลาด"
  - line-height ของข้อความภาษาไทยอย่างน้อย 1.6 เพื่อไม่ให้สระและวรรณยุกต์ชนกัน
- **สถานะของหน้าจอ:** ทุกหน้าที่ดึงข้อมูลต้องมี loading, empty state และ error state
- ต้องยืนยันก่อนทำ action ที่ย้อนกลับไม่ได้ (ลบ, ยกเลิกสัญญา)

### 15.2 Responsive & การรองรับอุปกรณ์

**หลักการ:** เขียน style สำหรับจอเล็กก่อน แล้วค่อยเพิ่มสำหรับจอที่ใหญ่ขึ้นด้วย breakpoint แบบ `min-width` (prefix `sm:` `md:` `lg:` ของ Tailwind) — **ห้าม** ทำ layout หลักแบบ desktop-first แล้วไล่ซ่อนด้วย `max-width`

#### 15.2.1 Breakpoints

ใช้ค่าเริ่มต้นของ Tailwind ทุกโปรเจกต์ — **ห้าม** ตั้ง breakpoint เองในแต่ละ app

| ชื่อ | ความกว้างขั้นต่ำ | อุปกรณ์หลัก |
|---|---|---|
| (base) | 0 | มือถือ |
| `sm` | 640px | มือถือแนวนอน / มือถือจอใหญ่ |
| `md` | 768px | แท็บเล็ตแนวตั้ง |
| `lg` | 1024px | แท็บเล็ตแนวนอน / แล็ปท็อปเล็ก |
| `xl` | 1280px | แล็ปท็อป / เดสก์ท็อป |
| `2xl` | 1536px | จอใหญ่ |

- ความกว้างต่ำสุดที่ต้องรองรับคือ **320px** และต้อง**ไม่มี scroll แนวนอน**ทั้งหน้า
- บนจอใหญ่ เนื้อหาต้องอยู่ใน container ที่มี max-width (ค่าเริ่มต้น 1280px) และข้อความยาวควรมีความยาวบรรทัดประมาณ 60–80 ตัวอักษร ห้ามยืดเต็มจอ

#### 15.2.2 อุปกรณ์และเบราว์เซอร์ที่ต้องทดสอบ

| กลุ่ม | Viewport | ตัวแทน |
|---|---|---|
| มือถือเล็ก | 360×640 | Android ราคาประหยัด (กลุ่มใหญ่ในไทย) |
| มือถือมาตรฐาน | 375×667, 393×852 | iPhone SE, iPhone รุ่นปัจจุบัน |
| มือถือจอใหญ่ | 430×932 | iPhone Pro Max / Android จอใหญ่ |
| แท็บเล็ต | 768×1024 และ 1024×768 | iPad แนวตั้ง / แนวนอน |
| แล็ปท็อป | 1366×768, 1440×900 | โน้ตบุ๊กสำนักงานทั่วไป |
| เดสก์ท็อป | 1920×1080 | จอ Full HD |

เบราว์เซอร์ที่ต้องรองรับ (กำหนดใน `browserslist` กลางที่ `packages/config`):

- Chrome Android, Samsung Internet และ Safari iOS (2 major ล่าสุด)
- **LINE in-app browser** และ Facebook/Messenger in-app browser — ลิงก์ส่วนใหญ่ในไทย (บิลหอพัก, ลิงก์ประกาศ, ลิงก์ร้านค้า) ถูกเปิดผ่านแอปเหล่านี้ จึงต้องทดสอบทุก flow สำคัญ
- Chrome, Edge, Safari และ Firefox บนเดสก์ท็อป (2 major ล่าสุด)

#### 15.2.3 Layout

- ใช้ flex/grid และหน่วยที่ยืดหยุ่น (`%`, `fr`, `minmax()`, `clamp()`) — **ห้าม** กำหนดความกว้างของ container เป็น px ตายตัว
- รูปและวิดีโอต้องกำหนด `aspect-ratio` หรือ width/height เพื่อไม่ให้เกิด layout shift และใช้ `next/image` พร้อม `sizes` ให้โหลดรูปขนาดที่เหมาะกับจอ
- ความสูงเต็มจอบนมือถือใช้ `100dvh` / `100svh` แทน `100vh` (แถบที่อยู่ของเบราว์เซอร์ทำให้ `100vh` ล้นจอ)
- องค์ประกอบที่ติดขอบจอ (bottom bar, ปุ่มลอย LINE/โทร) ต้องเว้นระยะด้วย `env(safe-area-inset-*)` สำหรับจอที่มีรอยบากหรือแถบ home และต้องไม่บังปุ่มหรือช่องกรอกข้อมูล
- Component ใน `packages/ui` ที่ถูกวางในพื้นที่หลายขนาด (การ์ด, widget) **ควร** ใช้ container queries (`@container`) แทนการผูกกับขนาดจอ
- ต้องใช้งานได้ทั้งแนวตั้งและแนวนอนบนมือถือและแท็บเล็ต — **ห้าม** ล็อก orientation

#### 15.2.4 รูปแบบ UI ตามขนาดจอ

| องค์ประกอบ | มือถือ (< `md`) | แท็บเล็ต (`md`–`lg`) | เดสก์ท็อป (≥ `lg`) |
|---|---|---|---|
| เมนูหน้าเว็บ | hamburger → drawer | hamburger หรือเมนูย่อ | เมนูเต็ม |
| เมนูหลังบ้าน | bottom tab bar (ไม่เกิน 5 เมนู) หรือ drawer | sidebar แบบไอคอน | sidebar เต็ม |
| ตารางข้อมูล | เปลี่ยนเป็นการ์ด หรือแสดงเฉพาะคอลัมน์สำคัญ | scroll แนวนอนในกล่อง + คอลัมน์แรก sticky | ตารางเต็ม |
| Modal / dialog | เต็มจอ หรือ sheet เลื่อนขึ้นจากด้านล่าง | กลางจอ | กลางจอ |
| ฟอร์ม | 1 คอลัมน์ | 1–2 คอลัมน์ | 2 คอลัมน์ได้ |
| กราฟ | ลดจำนวน label/tick หรือเลื่อนซ้าย-ขวาได้ | เต็ม | เต็ม |
| ปุ่มหลัก (CTA) | กว้างเต็มแถว ติดล่างจอได้ | ขนาดปกติ | ขนาดปกติ |

#### 15.2.5 Touch & Input

- พื้นที่แตะของปุ่ม ลิงก์ และไอคอนต้องมีขนาดอย่างน้อย **44×44px** และห่างกันอย่างน้อย 8px (WCAG 2.2 กำหนดขั้นต่ำ 24×24px — มาตรฐานนี้เข้มกว่า)
- **ห้าม** มีฟังก์ชันที่ใช้ได้เฉพาะตอน hover — เอฟเฟกต์ hover ต้องอยู่ใน `@media (hover: hover)` และทุกอย่างต้องทำได้ด้วยการแตะ
- ตัวอักษรใน input ต้องมีขนาดอย่างน้อย **16px** (กัน iOS Safari ซูมเองตอนแตะช่องกรอก) และเนื้อหาหลักบนมือถืออย่างน้อย 16px
- ใช้ `type` / `inputmode` / `autocomplete` ให้ถูกต้องเพื่อให้ได้คีย์บอร์ดที่เหมาะสม เช่น เบอร์โทร `type="tel"`, จำนวนเงิน `inputmode="decimal"`, OTP `autocomplete="one-time-code"`
- ช่องที่กำลังกรอกต้องไม่ถูกคีย์บอร์ดหรือแถบลอยบัง
- meta viewport ใช้ `width=device-width, initial-scale=1` — **ห้าม** ใส่ `user-scalable=no` หรือ `maximum-scale=1` เพราะผู้ใช้ต้องซูมได้
- ต้องเคารพ `prefers-reduced-motion` โดยปิดหรือลด animation เมื่อผู้ใช้ตั้งค่าไว้

#### 15.2.6 Performance บนมือถือ

- วัด Lighthouse แบบ mobile (จำลองเน็ตช้าและ CPU ช้า 4 เท่า) และต้องผ่านเกณฑ์ใน §14
- JavaScript ที่ต้องโหลดตอนเปิดหน้า public ต้องไม่เกิน 200 KB (gzip) ต่อ route
- **ห้าม** ส่งรูปขนาด desktop ให้มือถือ — ใช้ `sizes` และ format AVIF/WebP

#### 15.2.7 การทดสอบ

- Playwright **ต้อง** มี project อย่างน้อย 3 ขนาด: mobile (เช่น device `Pixel 7`), tablet (เช่น `iPad Pro 11`) และ desktop (1440×900) และรัน critical flows ตาม §7.2 ครบทุกขนาด
- **ต้อง** มี test อัตโนมัติว่าหน้าหลักไม่มี scroll แนวนอนที่ความกว้าง 320px (`document.documentElement.scrollWidth <= window.innerWidth`) โดยทำเป็น helper กลางใน `packages/testing`
- **ควร** ทำ visual regression (`toHaveScreenshot`) ของหน้าหลักในทุก breakpoint
- ก่อน go-live ต้องทดสอบบน**อุปกรณ์จริง** อย่างน้อย Android 1 เครื่อง, iPhone 1 เครื่อง และเปิดผ่าน LINE in-app browser
- HTML mockup ใน `designs/` ต้องตรวจที่ 390px และ 1440px ก่อนเสนอให้เลือก

#### 15.2.8 อุปกรณ์หลักของแต่ละโปรเจกต์

ใช้ตารางนี้จัดลำดับความสำคัญตอนออกแบบและทดสอบ — โปรเจกต์ใหม่ต้องเพิ่มแถวของตัวเอง

| โปรเจกต์ | ผู้ใช้ / หน้าจอ | อุปกรณ์หลัก |
|---|---|---|
| Fitness | สมาชิก (QR เช็กอิน, จองคลาส) | มือถือ, LINE in-app browser |
| | เคาน์เตอร์ (สแกนเช็กอิน, ขายแพ็กเกจ) | แท็บเล็ตแนวนอน |
| | ผู้จัดการ | เดสก์ท็อป + มือถือ |
| Dormitory | ผู้เช่า (ดูบิล, แนบสลิป, แจ้งซ่อม) | มือถือผ่าน LINE |
| | เจ้าของ / ผู้จัดการ | มือถือ + เดสก์ท็อป |
| | ช่าง / คนจดมิเตอร์ | มือถือ (ใช้งานมือเดียวได้) |
| Real Estate | ผู้หาบ้าน | มือถือก่อน |
| | agent | เดสก์ท็อป + มือถือ (อัปโหลดรูปจากกล้อง) |
| Company Website | ลูกค้าของเจ้าของเว็บ | มือถือก่อน |
| | ผู้แก้ไขเนื้อหา (CMS) | เดสก์ท็อป / แท็บเล็ต |

เอกสารที่ต้องพิมพ์ได้ (ใบแจ้งหนี้, ใบเสร็จ, ใบเสนอราคา) **ต้อง** มี `@media print` ที่จัดหน้า A4 ได้ถูกต้อง

---

## 16. SEO (เว็บสาธารณะ)

- ใช้ Metadata API ของ Next.js: `title`, `description`, canonical และ Open Graph ทุกหน้า
- สร้าง `sitemap.xml` และ `robots.txt` อัตโนมัติ หน้าหลังบ้านใส่ `noindex`
- URL อ่านง่ายและมี slug เช่น `/properties/condo-near-bts-ari-<id>`
- ใส่ structured data (JSON-LD) ตามประเภท เช่น `Organization`, `RealEstateListing`, `ExerciseGym`
- หน้า listing ใช้ SSG/ISR และถ้ามีหลายภาษาให้ใส่ `hreflang`

---

## 17. เอกสารประจำโปรเจกต์

ทุก app **ต้อง** มี:

| ไฟล์ | เนื้อหา |
|---|---|
| `README.md` | โปรเจกต์คืออะไร, วิธีรันในเครื่อง (ไม่เกิน 5 คำสั่ง), scripts ที่มี |
| `.env.example` | env var ทุกตัวพร้อมคำอธิบาย (ค่าปลอม) |
| `docs/ARCHITECTURE.md` | ภาพรวมระบบ, โดเมนหลัก, data model, integration ภายนอก, caching strategy |
| `docs/RBAC.md` | roles และ permission matrix |
| `docs/DATA-CLASSIFICATION.md` | field ที่เป็น PII พร้อมระดับและ retention |
| `docs/runbooks/` | deploy, rollback, restore, rotate secret, incident |
| `docs/adr/` | Architecture Decision Records |
| `CHANGELOG.md` | สร้างอัตโนมัติด้วย release-please |

---

## 18. Definition of Done

งานหนึ่งชิ้นถือว่าเสร็จเมื่อ:

- [ ] ทำงานได้ตาม acceptance criteria และ product owner ดูบน staging แล้ว
- [ ] ผ่าน CI ทุกขั้น (lint, typecheck, test, coverage, security scan)
- [ ] มี test ตาม §7.2
- [ ] ผ่าน code review ตาม §8.4
- [ ] ผ่าน E2E ทั้ง mobile / tablet / desktop (§15.2.7) มี loading/empty/error state และผ่าน a11y check
- [ ] ข้อความทั้งหมดอยู่ใน i18n
- [ ] อัปเดตเอกสารที่เกี่ยวข้องแล้ว (RBAC, DATA-CLASSIFICATION, ARCHITECTURE, runbook)
- [ ] Action สำคัญบันทึก audit log
- [ ] ไม่มี error ใหม่ใน Sentry หลัง deploy staging

---

## 19. Checklists

### 19.1 เริ่มโปรเจกต์ใหม่

1. [ ] สร้าง app จาก template กลาง (Turborepo generator) — ห้าม copy มาจากโปรเจกต์อื่นด้วยมือ
2. [ ] เขียน `docs/ARCHITECTURE.md` ฉบับแรก: โดเมน, กลุ่มผู้ใช้, integration ภายนอก
3. [ ] กำหนด roles และเขียน `docs/RBAC.md`
4. [ ] จัดระดับข้อมูลใน `docs/DATA-CLASSIFICATION.md` และระบุว่ามีข้อมูลอ่อนไหวตามมาตรา 26 หรือไม่
5. [ ] สร้าง DB, bucket และ secrets แยกทุก environment
6. [ ] ตั้ง Sentry project, uptime monitor และช่องทางแจ้งเตือน
7. [ ] เพิ่ม app เข้า CI (workflow, CODEOWNERS, Renovate)
8. [ ] ทำ design 2–3 แบบเป็น HTML mockup ใน `designs/` → เลือก 1 แบบ → แปลงเป็น component ใน `packages/ui`
9. [ ] ตั้ง domain, Cloudflare และ security headers

### 19.2 ก่อนขึ้น Production (Go-live)

- [ ] บังคับ 2FA สำหรับ staff/admin แล้ว
- [ ] Rate limit ครบตาม §10.6
- [ ] Security headers ได้เกรด A
- [ ] ZAP baseline ไม่พบ High และ pentest ผ่าน (หรือยอมรับความเสี่ยงที่เหลือพร้อมบันทึก)
- [ ] Backup อัตโนมัติทำงานแล้ว และซ้อม restore สำเร็จอย่างน้อย 1 ครั้ง
- [ ] ทดสอบแล้วว่า monitoring/alert แจ้งเตือนได้จริง
- [ ] Privacy notice, consent และ cookie banner (ถ้ามี cookie ที่ไม่จำเป็น) พร้อมใช้งาน
- [ ] Load test ที่ 2 เท่าของโหลดที่คาดการณ์ผ่านเกณฑ์
- [ ] ทดสอบบนอุปกรณ์จริงแล้ว (Android, iPhone และ LINE in-app browser) ตาม §15.2.7
- [ ] Runbook ของ deploy, rollback, restore และ incident พร้อม
- [ ] ลบบัญชีทดสอบและ seed data ออกจาก production แล้ว

---

## 20. Incident Response

| ระดับ | ตัวอย่าง | ตอบสนองภายใน |
|---|---|---|
| SEV1 | เว็บล่มทั้งระบบ, ข้อมูลรั่ว, รับเงินผิดพลาด | 15 นาที |
| SEV2 | ฟีเจอร์หลักใช้ไม่ได้ (เช็กอิน, ออกบิล) | 1 ชั่วโมง |
| SEV3 | ฟีเจอร์รองมีปัญหาแต่มีทางเลี่ยง | 1 วันทำการ |

**ขั้นตอน**

1. ประกาศ incident และกำหนดผู้รับผิดชอบหลัก
2. หยุดความเสียหาย (rollback, ปิดฟีเจอร์, revoke key)
3. สื่อสารกับผู้ที่ได้รับผลกระทบ
4. แก้ไขถาวร
5. ทำ postmortem แบบไม่กล่าวโทษ (blameless) ภายใน 5 วันทำการ พร้อม action items

**กรณีข้อมูลส่วนบุคคลรั่วไหล:** เก็บหลักฐาน (log, audit log) ก่อนแก้ไข ประเมินความเสี่ยง แจ้ง สคส. ภายใน 72 ชั่วโมง (§11.3) และหมุน secret ที่เกี่ยวข้องทั้งหมด

---

## 21. การขอข้อยกเว้นและการแก้ไขมาตรฐาน

- ถ้าต้องทำต่างจากมาตรฐาน ให้เขียน ADR ใน `docs/adr/` ของโปรเจกต์ ระบุเหตุผล ความเสี่ยง และวันทบทวน แล้วให้ reviewer อนุมัติ
- การแก้มาตรฐานนี้ทำผ่าน PR ที่แก้ไฟล์นี้ และอัปเดตตารางประวัติท้ายเอกสาร
- ทบทวนทั้งฉบับ **ทุก 6 เดือน** รวมถึงตารางเวอร์ชันใน §2.1

---

## ภาคผนวก A: ข้อกำหนดเฉพาะโดเมน

### A.1 Fitness

- **Roles:** owner, manager, front-desk, trainer, member
- **ข้อมูล Restricted:** ข้อมูลสุขภาพ (แบบประเมินก่อนออกกำลังกาย) และข้อมูลชีวมิติ (ถ้ามี)
- **กฎธุรกิจที่ต้อง test:** วันหมดอายุ, การพักและต่ออายุสมาชิก, เช็กอินซ้ำ, ความจุคลาส (กันจองเกินด้วย DB constraint หรือ lock), การยกเลิกการจองตามเวลาที่กำหนด
- **Integration:** QR check-in (`qrcode` + scanner), LINE OA, Omise (ตัดบัตรรายเดือน)
- **Jobs:** แจ้งเตือนสมาชิกใกล้หมดอายุ, ตัดเงินรายเดือน, สรุปรายได้รายวัน

### A.2 Dormitory

- **Roles:** owner, manager, staff/technician, tenant
- **ข้อมูล Restricted:** เลขบัตรประชาชนและรูปบัตร, เลขบัญชีสำหรับคืนเงินประกัน
- **กฎธุรกิจที่ต้อง test:** ค่าน้ำ/ไฟ (อัตรา, ค่าขั้นต่ำ, มิเตอร์วนรอบ), ค่าเช่าเมื่อเข้า-ออกกลางเดือน, ค่าปรับจ่ายช้า, การคืนเงินประกัน, เลขใบแจ้งหนี้ต่อเนื่องและไม่ซ้ำ, ผู้เช่าเห็นเฉพาะบิลห้องของตัวเอง
- **Integration:** LINE OA (ส่งบิล, แจ้งซ่อม), PromptPay QR + ตรวจสลิป, PDF ใบแจ้งหนี้/ใบเสร็จ
- **Jobs:** ออกบิลรายเดือน, เตือนค้างชำระ, สรุปรายงาน

### A.3 Real Estate

- **Roles:** admin, agent, owner (เจ้าของทรัพย์), visitor (ไม่ต้อง login)
- **ข้อมูล Confidential:** ข้อมูลผู้สอบถาม (lead) และข้อมูลติดต่อของเจ้าของทรัพย์ซึ่งไม่แสดงต่อสาธารณะ
- **กฎธุรกิจที่ต้อง test:** ค้นหา/กรอง, ค้นตามรัศมี (PostGIS), flow อนุมัติประกาศ, ประกาศหมดอายุ, SEO metadata และ JSON-LD
- **Integration:** แผนที่, อัปโหลดรูปจำนวนมาก (re-encode, หลายขนาด), Turnstile ที่ฟอร์มติดต่อ, แจ้ง agent ผ่าน LINE/อีเมล
- **Performance:** เกณฑ์ Core Web Vitals เข้มที่สุดในทุกโปรเจกต์ เพราะหน้า public คือช่องทางหาลูกค้า

### A.4 เว็บไซต์บริษัท (Company Website)

- **Roles:** admin, editor (แก้สินค้าและเนื้อหาได้ แต่จัดการผู้ใช้และตั้งค่าระบบไม่ได้), visitor (ไม่ต้อง login)
- **ข้อมูล Confidential:** ข้อมูลจากฟอร์มติดต่อและฟอร์มขอใบเสนอราคา (ชื่อ, เบอร์, อีเมล, บริษัท) — ต้องมีช่อง consent และกำหนด retention ของ lead
- **CMS:** ใช้ Payload CMS ตาม ADR-0001 ของโปรเจกต์ (สถานะ Proposed) — ผู้ใช้หลังบ้านต้องใช้ 2FA หรืออยู่หลัง Cloudflare Access และ access control ของทุก collection ต้อง deny by default
- **กฎที่ต้อง test:** editor เพิ่ม/แก้/ลบสินค้าได้แต่เปลี่ยน role ไม่ได้, สินค้าที่ปิดการแสดงผลต้องไม่โผล่ในหน้าเว็บ sitemap และ search, ฟอร์มติดต่อมี rate limit + Turnstile, อัปโหลดรูปผ่านกฎ §10.7
- **SEO:** JSON-LD `Organization` ทุกหน้า และ `Product` ในหน้ารายละเอียดสินค้า, sitemap อัปเดตทันทีเมื่อแก้สินค้า
- **Integration:** ปุ่ม LINE OA / Messenger / โทร, ฟอร์มแจ้งเข้า LINE และอีเมล, แผนที่ (embed)
- **Performance:** หน้า public ต้องผ่าน Core Web Vitals (§14) เพราะเป็นช่องทางหาลูกค้าหลักของธุรกิจ

---

## ภาคผนวก B: Templates

### B.1 ADR

```md
# ADR-0001: <ชื่อการตัดสินใจ>

- สถานะ: Proposed | Accepted | Superseded by ADR-XXXX
- วันที่: YYYY-MM-DD
- ผู้ตัดสินใจ: ...

## บริบท
## การตัดสินใจ
## ทางเลือกที่พิจารณา
## ผลที่ตามมา (ข้อดี / ข้อเสีย / ความเสี่ยง)
## วันทบทวน
```

### B.2 Pull Request

```md
## สรุปการเปลี่ยนแปลง

## ประเภท
feat / fix / refactor / chore / docs

## วิธีทดสอบ

## Checklist
- [ ] มี test ตาม §7.2 ของมาตรฐาน
- [ ] ไม่มี secret / PII ในโค้ด, log, fixture
- [ ] Migration เป็นแบบ expand-contract (ถ้ามี)
- [ ] อัปเดตเอกสารที่เกี่ยวข้องแล้ว
- [ ] แนบ screenshot (ถ้าเปลี่ยน UI)
```

### B.3 Postmortem

```md
# Postmortem: <ชื่อเหตุการณ์> (SEV<x>)

- วันที่เกิดเหตุ / ระยะเวลา:
- ผลกระทบ (ผู้ใช้กี่คน, ข้อมูลอะไร, เงินเท่าไร):
- Timeline (เวลา — เหตุการณ์):
- สาเหตุหลัก (root cause):
- อะไรที่ทำได้ดี / อะไรที่ควรดีกว่านี้:
- Action items (ผู้รับผิดชอบ — กำหนดเสร็จ):
```

---

## ประวัติการแก้ไข

| เวอร์ชัน | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-15 | ฉบับแรก |
| 1.1 | 2026-10-16 | เพิ่มภาคผนวก A.4 เว็บไซต์บริษัท |
| 1.2 | 2026-10-16 | เพิ่ม §15.2 Responsive & การรองรับอุปกรณ์ (breakpoints, device matrix, touch, การทดสอบ) |
