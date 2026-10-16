# FitFlow — ระบบจัดการฟิตเนส

ระบบหลังบ้านสำหรับฟิตเนส: จัดการสมาชิก แพ็กเกจ การเช็กอิน ตารางคลาส เทรนเนอร์ และการชำระเงิน พร้อมหน้าสำหรับสมาชิก

> ทำตาม [มาตรฐานการพัฒนาเว็บ](../../docs/ENGINEERING-STANDARD.md) — ข้อกำหนดเฉพาะของโปรเจกต์นี้อยู่ในภาคผนวก A.1

## สถานะ

🎨 **ขั้นเลือก design** — เลือก 1 จาก 4 แบบใน [`designs/`](designs) แล้วจะ scaffold Next.js app ตามแบบที่เลือก

| แบบ | ไฟล์ | แนวทาง |
|---|---|---|
| 1 | [`designs/design-1-pulse.html`](designs/design-1-pulse.html) | Dark + เขียวนีออน, ดูสปอร์ต, sidebar |
| 2 | [`designs/design-2-clarity.html`](designs/design-2-clarity.html) | Light + ฟ้า, สะอาดแบบ SaaS, top nav |
| 3 | [`designs/design-3-momentum.html`](designs/design-3-momentum.html) | ส้ม-ชมพู gradient, การ์ดโค้งมน, เน้นหน้าเคาน์เตอร์เช็กอิน |
| 4 | [`designs/design-4-ignite.html`](designs/design-4-ignite.html) | **รวมแบบ 1 + 3:** แดชบอร์ดโทนมืดของ Pulse + การ์ดสแกนเช็กอิน, ผลสมาชิก, ขายด่วนของ Momentum — เขียนแบบ mobile-first |

## Responsive (§15.2)

ทุก design ผ่านการตรวจอัตโนมัติที่ 320 / 390 / 768 / 1024 / 1440px: ไม่มี scroll แนวนอน, พื้นที่แตะ ≥ 44px, ตัวอักษรใน input ≥ 16px, hover อยู่ใน `@media (hover: hover)` และรองรับ reduced motion

| ขนาดจอ | เมนู |
|---|---|
| มือถือ (< 768px) | bottom tab bar ทุกแบบ |
| แท็บเล็ต (768–1023px) | Pulse, Ignite: sidebar แบบไอคอน · Clarity, Momentum: เมนูเป็นแถวที่สอง |
| เดสก์ท็อป (≥ 1024px) | เมนูเต็ม |

อุปกรณ์หลัก: สมาชิกใช้มือถือ / LINE in-app browser, เคาน์เตอร์ใช้แท็บเล็ตแนวนอน, ผู้จัดการใช้เดสก์ท็อปและมือถือ

## ขอบเขตระบบ

- **สมาชิก:** สมัคร, แพ็กเกจ, ต่ออายุ, พักสมาชิก, แจ้งเตือนใกล้หมดอายุ
- **เช็กอิน:** QR code จากมือถือสมาชิก, ปฏิเสธอัตโนมัติเมื่อหมดอายุ
- **คลาส & เทรนเนอร์:** ตารางคลาส, จองที่นั่ง (จำกัดความจุ), จองเทรนเนอร์ส่วนตัว
- **การเงิน:** PromptPay QR, ตัดบัตรรายเดือน (Omise), ใบเสร็จ, รายงานรายได้
- **แจ้งเตือน:** LINE OA

## Roles

owner · manager · front-desk · trainer · member
