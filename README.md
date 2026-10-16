# Web Projects Monorepo

รวมโปรเจกต์เว็บทั้งหมด แต่ละโปรเจกต์แยกโฟลเดอร์อยู่ใน `apps/` และทุกโปรเจกต์ต้องทำตาม [มาตรฐานการพัฒนาเว็บ](docs/ENGINEERING-STANDARD.md)

| โปรเจกต์ | โฟลเดอร์ | สถานะ |
|---|---|---|
| ระบบจัดการฟิตเนส | [`apps/fitness`](apps/fitness) | เลือก design |
| ระบบจัดการหอพัก | [`apps/dormitory`](apps/dormitory) | เลือก design |
| ระบบอสังหาริมทรัพย์ | [`apps/real-estate`](apps/real-estate) | เลือก design |
| เว็บไซต์บริษัท | [`apps/company-website`](apps/company-website) | เลือก design |

## ดู Design ทั้งหมด

แต่ละโปรเจกต์มี design ให้เลือก 3 แบบ เป็นไฟล์ HTML ธรรมดาอยู่ใน `apps/<project>/designs/` เปิดหน้ารวมได้ที่ [`docs/design-gallery.html`](docs/design-gallery.html) (เปิดในเบราว์เซอร์ได้เลย)

## โครงสร้าง

```
apps/        # แต่ละโปรเจกต์ (Next.js app — จะ scaffold หลังเลือก design)
packages/    # โค้ดที่ใช้ร่วมกัน (ui, auth, security, utils, config, testing)
docs/        # มาตรฐานกลางและเอกสารร่วม
```
