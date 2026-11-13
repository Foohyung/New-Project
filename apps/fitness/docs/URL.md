# URL และ Parameter

ทำตามกติกาใน [มาตรฐานกลาง §3.4](../../../docs/ENGINEERING-STANDARD.md#34-การตั้งชื่อ):
- **path** เป็นภาษาอังกฤษ kebab-case ตั้งตามชื่อหน้า หน้าเพิ่มข้อมูลใช้ `/<ข้อมูล>/new` และหน้าของข้อมูลชิ้นเดียวใช้ `/<ข้อมูล>/<id>`
- **query parameter** เป็นคำอังกฤษเต็ม ตัวเล็ก ไม่ย่อ · `from`/`to` ใช้กับช่วงวันที่เท่านั้น
- **ห้าม**ใส่ชื่อคนหรือข้อมูลส่วนบุคคลใน URL

## URL เดิม → ใหม่

ของเดิมยังเปิดได้: path เดิม redirect 308 ใน `next.config.ts` (คง query เดิมไว้) · parameter เดิมยังอ่านได้ในหน้า

| เดิม | ใหม่ | วิธีรองรับของเดิม |
|---|---|---|
| `/marketing` | `/reminders` | redirect ใน `next.config.ts` |
| `/marketing/coupons` | `/coupons` | redirect ใน `next.config.ts` |
| `/pos` | `/sales` | redirect ใน `next.config.ts` |
| `/me/food` | `/me/nutrition` | redirect ใน `next.config.ts` |
| `/me/workout` | `/me/workouts` | redirect ใน `next.config.ts` |
| `/roles?role=new` | `/roles/new` | หน้า `/roles` redirect เอง |
| `/roles?role=<id>` | `/roles/<id>` | หน้า `/roles` redirect เอง · id ที่ไม่มีอยู่กลับ `/roles` · ตั้ง id role ว่า `new` ไม่ได้ |
| `/members?pkg=<id>` | `/members?package=<id>` | หน้าสมาชิกยังอ่าน `pkg` |
| `/login?passwordChanged=1` | `/login?password=changed` | popup ยังอ่านแบบเดิม |
| `/me?from=reminder` (ลิงก์ในข้อความเตือน) | `/me?ref=reminder` | หน้าสมาชิกยังอ่าน `from=reminder` เพราะข้อความที่ส่งไปแล้วยังใช้ลิงก์เดิม |
| `?deleted=<ชื่อ>` หลังลบ | `?deleted=1` + cookie `ff-deleted` อายุ 60 วินาที | — (เกิดเฉพาะตอนลบ ไม่มีลิงก์ค้าง) |

## Parameter ที่ใช้อยู่

| Parameter | ใช้ที่ | ค่า |
|---|---|---|
| `from`, `to` | รายงาน, แจ้งเตือนต่ออายุ, ชำระเงิน, สมาชิก (วันหมดอายุ), ประวัติการเข้าสู่ระบบ | วันที่ `YYYY-MM-DD` · คลาสใช้ `from` เป็นวันเริ่มสัปดาห์ |
| `day` | คลาส, จองคลาสของสมาชิก | วันที่ `YYYY-MM-DD` |
| `view` | สมาชิก, ชำระเงิน, คลาส | มุมมอง เช่น `cards`, `week` (ค่าเริ่มต้นไม่ใส่) |
| `status`, `sort`, `q`, `package`, `method`, `trainer` | หน้ารายการ | ตัวกรอง/การเรียง |
| `branch` | แดชบอร์ด (admin), การเงิน `/payments` (admin), บัญชีผู้ใช้ | ชื่อสาขา |
| `page`, `ip` | ประวัติการเข้าสู่ระบบ | หน้าที่ · IP ที่กรอง |
| `next` | `/login` | path ที่จะกลับไปหลังเข้าสู่ระบบ (ตรวจด้วย `safeNextPath`) |
| `back` | แก้ไขบัญชีผู้ใช้ | path ของหน้าที่กดมา |
| `created` | รายละเอียดสมาชิก/ชำระเงิน | `1` = เพิ่งสร้าง แสดงแจ้งผล |
| `coupon`, `ref` | หน้าสมาชิก `/me` | โค้ดคูปอง · `ref=reminder` = มาจากข้อความเตือน |
