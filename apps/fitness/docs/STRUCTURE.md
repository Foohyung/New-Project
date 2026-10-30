# โครงสร้างโฟลเดอร์ FitFlow

เปิด `src/` จะเจอ 2 ส่วนหลัก:
- **`web/`** — หน้าบ้าน (Frontend)
- **`api/`** — หลังบ้าน (Backend)

ข้างในแต่ละส่วนจะแบ่งตาม **ชนิดของไฟล์** ก่อน (app, components, hooks, …) แล้วจึงแบ่งย่อยเป็น **เรื่อง > โฟลเดอร์ > ไฟล์** เช่น `src/web/app/dashboard/dashboard/dashboard.page.tsx`
- ชั้นเรื่องคือเรื่องหลัก
- ชั้นถัดไปคือส่วนย่อยของเรื่องนั้น ตอนนี้แต่ละเรื่องมีส่วนเดียว จึงใช้ชื่อเดียวกัน
- เมื่อเรื่องไหนโตขึ้น ให้เพิ่มโฟลเดอร์ข้างกัน เช่น `src/api/dal/payments/subscriptions/`

```
app/              ← (อยู่นอก src) เส้นทาง URL ของ Next.js — ดูหัวข้อท้ายไฟล์
proxy.ts          ← (อยู่นอก src) ตรวจ session ก่อนเข้าทุกหน้า ต้องอยู่ระดับเดียวกับ app/
src/
├── web/          ← Frontend
│   ├── app/          หน้าเว็บ           app/members/members/members.page.tsx · members.detail.page.tsx · members.new.page.tsx
│   ├── components/   component          components/members/members/members.forms.tsx · components/ui/ui/ui.tsx (Card, Badge, …)
│   │                                    components/ui/ui/ (ui.action-button · ui.confirm-form · ui.delete-button · ui.toast · ui.file-drop — ดู docs/UI.md)
│   │                                    components/layout/layout/ (เมนู โลโก้ แอนิเมชัน ธีม)
│   ├── hooks/        React hook         hooks/ui/ui/ui.use-form-action.ts
│   ├── lib/          logic ฝั่งหน้าเว็บ  lib/layout/layout/layout.motion-routes.ts
│   └── test/         unit test          test/layout/layout/layout.motion-routes.test.ts
└── api/          ← Backend
    ├── actions/      Server Action      actions/members/members/members.actions.ts
    ├── dal/          อ่าน/เขียนฐานข้อมูล  dal/members/members/members.dal.ts
    ├── services/     business logic     services/members/members/members.service.ts
    ├── schemas/      Zod schema         schemas/members/members/members.schema.ts
    ├── types/        type ที่ใช้ร่วม      types/members/members/members.types.ts
    ├── routes/       Route Handler      routes/reports/reports/reports.export.route.ts · routes/health/health/health.route.ts
    ├── lib/          แกนกลาง            lib/db/db/db.ts (Prisma + generated/) · lib/auth/auth/ (session, guard, rbac, accounts)
    │                                    lib/audit/audit/audit.log.ts · lib/clock · lib/security · lib/utils (เงิน วันที่ เบอร์โทร) · lib/theme
    └── test/         unit test + test DAL  test/members/members/members.test.ts · members.dal.test.ts · test/setup · test/db
```

แต่ละชนิดมีเฉพาะเรื่องที่มีไฟล์ชนิดนั้นจริง เช่น `api/schemas` ไม่มี `dashboard` เพราะแดชบอร์ดไม่มีฟอร์ม

## ชื่อไฟล์ `<เรื่อง>.<ชนิด>.ts(x)`

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `web/app` | หน้าเว็บ 1 หน้า: ตรวจสิทธิ์ (`pageGuard`) → ดึงข้อมูลจาก DAL → ส่ง props ให้ component |
| `web/components` · `web/hooks` · `web/lib` | ใช้ได้แค่ `api/actions`, `api/services`, `api/schemas`, `api/types` และ `api/lib/utils` · **ห้าม** import `api/dal` หรือ `api/lib/{db,auth,audit,clock,theme}` (ESLint บังคับ) |
| `api/actions` | Server Action: session → Zod → DAL → `audit()` |
| `api/dal` | ตรวจสิทธิ์ก่อน แล้วอ่าน/เขียนฐานข้อมูล คืนค่าเป็น DTO (`server-only`) |
| `api/services` | business logic ล้วน ไม่แตะฐานข้อมูล |
| `api/lib` | ส่วนที่ทุกเรื่องใช้ร่วม: ฐานข้อมูล, session/สิทธิ์, audit log, เวลา, security headers, utils |
| `*/test` | `*.test.ts` = unit test · `*.dal.test.ts` = test ของ DAL (ต้องมี `TEST_DATABASE_URL`) |

## `app/` (นอก src) คืออะไร

Next.js อ่านเส้นทาง URL จากโฟลเดอร์ชื่อ `app` เท่านั้น ซึ่งต้องอยู่ที่ root ของโปรเจกต์ หรือที่ `src/app`
- เราวางไว้ที่ root เพื่อให้ `src/` มีแค่ `web` กับ `api`
- `proxy.ts` ต้องอยู่ระดับเดียวกับ `app/` จึงอยู่ที่ root ด้วย
- ไฟล์ใน `app/` เป็นแค่ตัวชี้ไปยังหน้าจริงใน `src/web/app`:

```ts
// app/members/[id]/page.tsx  →  URL /members/123
export { default, metadata } from '@/web/app/members/members/members.detail.page';
```

**หน้าที่มีพารามิเตอร์ซ้อนกัน** เช่น `/users/[id]` (หน้าเจ้าของ) กับ `/users/[id]/edit` (แก้ไขบัญชี) อยู่ใน `app/users/[id]/page.tsx` และ `app/users/[id]/edit/page.tsx` · หน้าที่ไม่ต้องเข้าสู่ระบบ (`/login`, `/forgot-password`) ต้องเพิ่มใน `proxy.ts` ด้วย

**เพิ่มหน้าใหม่:**
1. สร้าง `src/web/app/<เรื่อง>/<เรื่อง>/<เรื่อง>.<ชื่อ>.page.tsx`
2. สร้าง `app/<url>/page.tsx` ที่ re-export หน้านั้น

ไฟล์เหล่านี้ยังอยู่ใน `app/` ตามที่ Next.js กำหนด:
- `layout.tsx`, `error.tsx`, `not-found.tsx`, `loading.tsx`
- `globals.css`
- ไอคอน

ห้ามสร้าง `src/app` เพิ่ม เพราะเมื่อมี `app/` ที่ root แล้ว Next.js จะไม่อ่าน `src/app`
