# BaanHub — ระบบอสังหาริมทรัพย์

เว็บประกาศซื้อ-ขาย-เช่าอสังหาริมทรัพย์: ค้นหาทรัพย์ แผนที่ หน้ารายละเอียด ฟอร์มติดต่อ พร้อมหลังบ้านสำหรับ agent จัดการประกาศและ lead

> ทำตาม [มาตรฐานการพัฒนาเว็บ](../../docs/ENGINEERING-STANDARD.md) — ข้อกำหนดเฉพาะของโปรเจกต์นี้อยู่ในภาคผนวก A.3

## สถานะ

🚧 **ระยะที่ 1 เสร็จ:** สร้างเว็บตามแบบ 3 — Hearth แล้ว ใช้ข้อมูลตัวอย่าง · ระยะที่ 2: PostgreSQL + Prisma, login ด้วย Better Auth + 2FA, RBAC และ audit log ลงฐานข้อมูล รวมถึงหลังบ้านของ agent

เก็บแบบ 2 (Marketplace) และแบบ 4 (Nest) ไว้เป็นแบบอ้างอิงสำหรับหน้าค้นหาแบบรายการคู่แผนที่

| แบบ | ไฟล์ | แนวทาง |
|---|---|---|
| **3 (เลือก)** | [`designs/design-3-hearth.html`](designs/design-3-hearth.html) | โทนอบอุ่นดินเผา, แนว lifestyle/ย่านน่าอยู่ |
| 2 (อ้างอิง) | [`designs/design-2-marketplace.html`](designs/design-2-marketplace.html) | Marketplace ขาว-น้ำเงิน, ค้นหาแบบรายการ + แผนที่ |
| 4 (อ้างอิง) | [`designs/design-4-nest.html`](designs/design-4-nest.html) | **รวมแบบ 2 + 3:** รายการคู่แผนที่และการ์ดมี agent ของ Marketplace + ตัวกรองไลฟ์สไตล์, % ตรงใจ, คะแนนย่าน, ค่าผ่อนบนทุกประกาศของ Hearth — เขียนแบบ mobile-first |

ภาพโปรโมทอยู่ใน [`promo/`](promo) (มีครบทั้ง 3 แบบที่เหลือ)

ภาพโปรโมทจากหน้าจอเว็บจริง (PDF 1 หน้า A4 มีราคา รายเดือน / รายปี / ซื้อขาด) มี 3 สไตล์: [`showcase`](promo/BaanHub-โปรโมท-1-showcase.pdf) · [`spotlight`](promo/BaanHub-โปรโมท-2-spotlight.pdf) · [`editorial`](promo/BaanHub-โปรโมท-3-editorial.pdf)

## หน้าเว็บ (ระยะที่ 1)

```bash
pnpm --filter @app/real-estate dev   # http://localhost:3003
```

| หน้า | path | ทำอะไรได้ |
|---|---|---|
| หน้าแรก | `/?tags=&q=&max=&listing=` | ค้นหา, กรองตามไลฟ์สไตล์ (ทำงานได้แม้ปิด JavaScript เพราะเป็นลิงก์), ย่านน่าอยู่, เครื่องคำนวณค่าผ่อน |
| ประกาศ | `/homes/[slug]` | รายละเอียด, ค่าผ่อนต่อเดือน, ฟอร์มนัดชม — มี canonical, Open Graph และ JSON-LD `RealEstateListing` |
| SEO | `/sitemap.xml`, `/robots.txt` | สร้างจากรายการประกาศ |
| health | `/api/health` | liveness check |

ฟอร์มนัดชมไม่ต้อง login จึงป้องกันด้วย rate limit 10 ครั้ง/ชม. ต่อ IP, honeypot และต้องติ๊กยินยอมตาม PDPA ก่อนส่ง ค่า env ดูได้ใน [`.env.example`](.env.example) (production ต้องตั้ง `SITE_URL` และ `TRUSTED_IP_HEADER`)

**Test:** unit ของตัวกรอง ค่าผ่อน และ rate limit · E2E ของตัวกรอง, SEO/JSON-LD, 404, ฟอร์มนัดชม, drawer เมนู และ sitemap ที่ขนาดมือถือ / แท็บเล็ต / เดสก์ท็อป

## Responsive (§15.2)

ทุก design ผ่านการตรวจอัตโนมัติที่ 320 / 390 / 768 / 1024 / 1440px: ไม่มี scroll แนวนอน, พื้นที่แตะ ≥ 44px, ตัวอักษรใน input ≥ 16px, hover อยู่ใน `@media (hover: hover)` และรองรับ reduced motion

| ขนาดจอ | เมนู | Hearth (แบบที่เลือก) | การค้นหาบนแผนที่ (Marketplace, Nest) |
|---|---|---|---|
| มือถือ / แท็บเล็ต (< 1024px) | hamburger → drawer | ภาพ collage ย่อลง, การ์ดบ้าน 1–2 คอลัมน์, เครื่องคำนวณค่าผ่อนเป็นคอลัมน์เดียว | Marketplace: แผนที่อยู่เหนือรายการ · Nest: ปุ่มลอยสลับ "รายการ ↔ แผนที่" เต็มจอ และแตะหมุดเพื่อดูการ์ดย่อ |
| เดสก์ท็อป (≥ 1024px) | เมนูเต็ม | การ์ดบ้าน 3 คอลัมน์ | รายการคู่แผนที่แบบ sticky |

อุปกรณ์หลัก: ผู้หาบ้านใช้มือถือก่อน, agent ใช้เดสก์ท็อปและมือถือ (อัปโหลดรูปจากกล้อง)

## ขอบเขตระบบ

- **หน้าสาธารณะ (SEO สำคัญ):** ค้นหา/กรอง (ซื้อ/เช่า, ประเภท, ราคา, ห้องนอน), ค้นบนแผนที่และตามรัศมี, หน้ารายละเอียดทรัพย์
- **Lead:** ฟอร์มติดต่อ/นัดชม (Turnstile), แจ้ง agent ผ่าน LINE/อีเมล
- **หลังบ้าน:** agent จัดการประกาศ, อัปโหลดรูปจำนวนมาก, flow อนุมัติประกาศ, ประกาศหมดอายุ
- **เจ้าของทรัพย์:** ฝากขาย/ฝากเช่า, ดูสถิติการเข้าชม

## Roles

admin · agent · owner · visitor
