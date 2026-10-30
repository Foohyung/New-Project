# FitFlow — รูปแบบ UI มาตรฐาน

ตาม §15.10–15.11 ของ[มาตรฐาน](../../../docs/ENGINEERING-STANDARD.md) · ทุกฟอร์ม/ปุ่มใหม่ **ต้อง** ใช้ component ในตารางนี้ ไม่สร้างแบบใหม่เอง

## ฟอร์มและการแจ้งผล

| ต้องการ | ใช้ | ไฟล์ |
|---|---|---|
| ปุ่มเรียก Server Action ครั้งเดียว (ยกเลิกจอง ยืนยันเงินเข้า ฯลฯ) | `<ActionButton confirm="…" successTitle="…">` — มี `confirm` แล้วสำเร็จจะขึ้น popup กลางจอ ("ทำรายการสำเร็จ" ถ้าไม่ส่ง `successTitle`) | `src/web/components/ui/ui/ui.action-button.tsx` |
| ฟอร์มแก้ไขข้อมูล | `<ConfirmForm confirm="บันทึกการแก้ไข…?" confirmTitle="ยืนยันการแก้ไข">` + `<ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />` | `ui.confirm-form.tsx` |
| ฟอร์มหลายช่องที่ต้องไม่ล้างค่าเมื่อ error | `useFormAction(action)` → `onSubmit` (ไม่ยืนยัน) หรือ `submit` คู่กับ `<ConfirmForm onSubmitData={submit}>` (ยืนยัน) | `src/web/hooks/ui/ui/ui.use-form-action.ts` |
| ไอคอนลบท้ายแถว | `<DeleteIconButton>` — ยืนยันปุ่มแดง → popup "ลบสำเร็จ" / toast แดงเมื่อไม่สำเร็จ | `ui.delete-button.tsx` |
| ปุ่มลบเต็มขนาดในหน้ารายละเอียด | `<DeleteButton>` + action ที่ `redirect('/<รายการ>?deleted=<ชื่อ>')` เมื่อสำเร็จ | `ui.delete-button.tsx` |
| แจ้งผลเองจากโค้ด | `toast(message, 'success' \| 'error')` มุมจอ · `showSuccess(title, message)` กลางจอ · `useNotifyingAction(action, { successTitle })` เรียก action แล้วแจ้งผลทันที (ใช้กับปุ่มในแถวที่จะหายไปหลังทำ) | `ui.toast.tsx` |
| แนบไฟล์/รูป | `<FileDrop maxBytes={…}>` ลากวาง/กดเลือก พรีวิว เปลี่ยน/เอาออก | `ui.file-drop.tsx` |

`<Toaster />` และ `<DeletedFlash />` (อ่าน `?deleted=` / `?passwordChanged=1` แล้วแสดง popup) อยู่ใน `app/layout.tsx` แล้ว ไม่ต้องใส่ในหน้า

**action ที่ใช้กับปุ่ม/ฟอร์ม** คืน `ActionResult` (`{ ok, message, fieldErrors? }`) · ข้อความสำเร็จบอกชื่อสิ่งที่ทำ เช่น "ลบบัญชี สมชาย แล้ว" · error code จาก DAL แปลงเป็นข้อความที่บอกวิธีแก้ใน `knownFailure()` (`src/api/types/shared/shared/shared.action-result.ts`)

## ตารางและการนำทาง

| ต้องการ | ใช้ |
|---|---|
| ปุ่มท้ายแถว 👁 ✏️ 🗑 | `MemberRowActions` (สมาชิก) · `UserRowActions` (บัญชีผู้ใช้) — วางใน `<div className="flex items-center gap-2">` ร่วมกับป้ายสถานะ ในช่องสุดท้าย `w-px whitespace-nowrap` |
| ป้ายสถานะบัญชีที่คิดช่วงวันที่ใช้งานด้วย | `UserStatusBadge` (ใช้งาน · ยังไม่ถึงวันเริ่ม · หมดช่วงใช้งาน · ปิดใช้งาน) |
| ปุ่มย้อนกลับ | `PageHeader back={{ href, label }}` — แสดงเป็น "กลับไปหน้า<label>" ให้ส่ง `label` เป็นชื่อหน้า เช่น `'สมาชิก'` ไม่ใช่ `'กลับ'` |
| แอนิเมชันเปลี่ยนหน้า | ใส่ path ใน `EXACT`/`PATTERNS` ของ `src/web/lib/layout/layout/layout.motion-routes.ts` เฉพาะหน้าที่เข้าจากเมนู · หน้าที่เปิดจากปุ่มในแถวไม่ต้องใส่ |

## ข้อยกเว้นจากมาตรฐานกลาง (ระยะที่ 1)

| เรื่อง | มาตรฐาน | FitFlow ตอนนี้ | เหตุผล / แผน |
|---|---|---|---|
| ความยาวรหัสผ่าน (§10.1) | ≥ 12 ตัว | ผู้ใช้ตั้งเอง ≥ 8 ตัว · บัญชีที่พนักงานสร้าง 1–200 ตัว | ตามที่เจ้าของระบบกำหนด · ระยะที่ 2 ย้ายไป Better Auth + ตรวจ HIBP |
| รหัสผ่านเริ่มต้น | — | สมาชิกใหม่และบัญชีที่รีเซ็ตใช้ `12345678` แล้ว**บังคับเปลี่ยน**ที่ขั้นที่ 2 ของหน้า login | ยังไม่มีช่องทางส่ง SMS/อีเมล |
| ลืมรหัสผ่าน (§10.1 token 30 นาที) | ลิงก์/OTP ใช้ครั้งเดียว | ส่งคำขอ → พนักงานตรวจตัวตนแล้วรีเซ็ต | ยังไม่มีช่องทางส่งข้อความ |
| รูปแบบเบอร์โทร (§15.1) | `08X-XXX-XXXX` | เบอร์สมาชิกใส่อะไรก็ได้ ≤ 10 ตัว (ตัดขีด/ช่องว่างก่อนเก็บ) · แสดงแบบมีขีดเมื่อเป็นเบอร์มือถือไทย | รองรับเบอร์บ้าน/ต่างประเทศตามที่ร้านต้องการ |
