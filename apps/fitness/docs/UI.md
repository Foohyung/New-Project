# FitFlow — รูปแบบ UI มาตรฐาน

ตาม §15.10–15.11 ของ[มาตรฐาน](../../../docs/ENGINEERING-STANDARD.md) · ทุกฟอร์ม/ปุ่มใหม่ **ต้อง** ใช้ component ในตารางนี้ ไม่สร้างแบบใหม่เอง

**ธีม:** `ThemeSwitcher` ให้เลือกพาเลตต์ (Pulse, Daylight, Ocean, Sunset) และโหมดสีมืด/สว่างแยกกัน โดยบันทึกค่าทั้งสองไว้ใน cookie · `app/globals.css` กำหนดสี token ตาม `data-theme` และ `data-mode`

## ฟอร์มและการแจ้งผล

| ต้องการ | ใช้ | ไฟล์ |
|---|---|---|
| ปุ่มเรียก Server Action ครั้งเดียว (ยกเลิกจอง ยืนยันเงินเข้า ฯลฯ) | `<ActionButton confirm="…" successTitle="…">` — มี `confirm` แล้วสำเร็จจะขึ้น popup กลางจอ ("ทำรายการสำเร็จ" ถ้าไม่ส่ง `successTitle`) | `src/web/components/ui/ui/ui.action-button.tsx` |
| ฟอร์มแก้ไขข้อมูล | `<ConfirmForm confirm="บันทึกการแก้ไข…?" confirmTitle="ยืนยันการแก้ไข">` + `<ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />` | `ui.confirm-form.tsx` |
| ฟอร์มหลายช่องที่ต้องไม่ล้างค่าเมื่อ error | `useFormAction(action)` → `onSubmit` (ไม่ยืนยัน) หรือ `submit` คู่กับ `<ConfirmForm onSubmitData={submit}>` (ยืนยัน) | `src/web/hooks/ui/ui/ui.use-form-action.ts` |
| ไอคอนลบท้ายแถว | `<DeleteIconButton>` — ยืนยันปุ่มแดง → popup "ลบสำเร็จ" / toast แดงเมื่อไม่สำเร็จ | `ui.delete-button.tsx` |
| ปุ่มลบเต็มขนาดในหน้ารายละเอียด | `<DeleteButton>` + action ที่ `redirect(await deletedRedirectPath('/<รายการ>', ชื่อ))` เมื่อสำเร็จ (ชื่อไปทาง cookie · URL มีแค่ `?deleted=1`) | `ui.delete-button.tsx` |
| แจ้งผลเองจากโค้ด | `toast(message, 'success' \| 'error')` มุมจอ · `showSuccess(title, message)` กลางจอ · `useNotifyingAction(action, { successTitle })` เรียก action แล้วแจ้งผลทันที (ใช้กับปุ่มในแถวที่จะหายไปหลังทำ) | `ui.toast.tsx` |
| ปุ่มเพิ่มรายการ | `<AddButton label="เพิ่ม…">` ปุ่ม + กลมสีหลัก วางเป็นลูกตัวสุดท้ายของ `<Card>` รายการ → อยู่มุมขวาล่างของกล่อง กดแล้วเปิด `FormDialog` · **ไม่ใช้**ปุ่มเพิ่มที่หัวหน้าหรือฟอร์มเพิ่มค้างไว้บนหน้า · ตัวอย่าง `AddPackageButton` `AddCourseButton` `AddProductButton` `AddBranchButton` `AddCouponButton` `AddTrainerButton` | `ui.form-dialog.tsx` |
| แนบรูปและตรวจไฟล์ | `<FileDrop>` ฝั่งหน้าเว็บ + `readImageUpload(file, maxBytes)` ฝั่ง action (ตรวจชนิดจาก magic bytes) — เก็บ base64 ในคอลัมน์ MEDIUMTEXT และเสิร์ฟผ่าน route handler | `src/api/services/shared/shared/shared.image.ts` |
| เพิ่ม/แก้ไขใน popup (ไม่เปิดหน้าใหม่) | `<FormDialog open onClose title>` ใส่ฟอร์มไว้ข้างใน — เนื้อหา mount ใหม่ทุกครั้งที่เปิด · ปิดเองเมื่อ `state.ok` · มีปุ่ม "ยกเลิก" ในฟอร์ม · ตัวอย่าง `AddPackageButton` / `PackageRowActions` ใน `packages.form.tsx` | `ui.form-dialog.tsx` |
| แนบไฟล์/รูป | `<FileDrop maxBytes={…}>` ลากวาง/กดเลือก พรีวิว เปลี่ยน/เอาออก | `ui.file-drop.tsx` |
| ตั้งค่าวิธีรับชำระรายสาขา | หน้า `/payment-settings` จำกัด Admin/Owner · PromptPay เลือกเลขเพื่อสร้าง QR ตามยอด หรืออัปโหลด QR ภาพ (มีรูปอยู่แล้ว: เลือกรูปใหม่ = แทนที่ · ปุ่ม "ลบรูป" ลบเมื่อกดบันทึก ยกเลิกได้) · การ์ด "ใบเสร็จ" แก้หัวใบเสร็จ (ช่องว่างแสดงค่าเริ่มต้นจาง ๆ) และรูปแบบเลขที่ใบเสร็จ (ช่องเติมรูปแบบที่สาขาใช้อยู่ให้ + แสดงเลขใบล่าสุด/ใบถัดไปจริงของงวดนี้ · แก้รูปแบบแล้วแสดงตัวอย่างใบแรกของรูปแบบใหม่) | `src/web/components/payments/payments/payment-settings.form.tsx`, `receipt-settings.form.tsx` · `FileDrop` รับ `current` + `removeName` |

`<Toaster />` และ `<DeletedFlash />` (อ่าน `?deleted=1` + cookie `ff-deleted` / `?password=changed` / `?denied=1` แล้วแสดง popup หรือแจ้งเตือน) อยู่ใน `app/layout.tsx` แล้ว ไม่ต้องใส่ในหน้า

**action ที่ใช้กับปุ่ม/ฟอร์ม** คืน `ActionResult` (`{ ok, message, fieldErrors? }`) · ข้อความสำเร็จบอกชื่อสิ่งที่ทำ เช่น "ลบบัญชี สมชาย แล้ว" · error code จาก DAL แปลงเป็นข้อความที่บอกวิธีแก้ใน `knownFailure()` (`src/api/types/shared/shared/shared.action-result.ts`)

## ตารางและการนำทาง

| ต้องการ | ใช้ |
|---|---|
| ปุ่มท้ายแถว 👁 ✏️ 🗑 | `MemberRowActions` (สมาชิก) · `UserRowActions` (บัญชีผู้ใช้) · `PackageRowActions` (แพ็กเกจ) · `CourseRowActions` (คอร์ส) · `ProductRowActions` (สินค้า — 📦 สต็อก) — ✏️ ของสามตัวนี้เปิด popup — วางใน `<div className="flex items-center gap-2">` ร่วมกับป้ายสถานะ ในช่องสุดท้าย `w-px whitespace-nowrap` |
| ป้ายสถานะบัญชีที่คิดช่วงวันที่ใช้งานด้วย | `UserStatusBadge` (ใช้งาน · ยังไม่ถึงวันเริ่ม · หมดช่วงใช้งาน · ปิดใช้งาน) |
| ปุ่มย้อนกลับ | `PageHeader back={{ href, label }}` — แสดงเป็น "กลับไปหน้า<label>" ให้ส่ง `label` เป็นชื่อหน้า เช่น `'สมาชิก'` ไม่ใช่ `'กลับ'` |
| หน้าแรกก่อนเข้าสู่ระบบ | `src/web/components/landing/landing/` (mockup แบบ D ที่เลือกไว้) — ปุ่มแคปซูลใช้ `pillPrimary`/`pillGhost` จาก `landing.styles.ts` (ไฟล์ธรรมดา เพราะค่าที่ export จากไฟล์ `'use client'` ใช้ใน server component ไม่ได้) · ปุ่มหลักคือ "เข้าสู่ระบบ" · ห่อเนื้อหาด้วย `ff-static` เพื่อไม่ใช้แอนิเมชันพุ่งเข้าจากซ้าย · ส่วนที่ใส่ `data-reveal` จะลอยขึ้นเมื่อเลื่อนถึง (`landing.reveal.tsx` แบบเดียวกับ mockup D · ปิดเองเมื่อลดการเคลื่อนไหว) · หัวข้อ "คำถามที่พบบ่อย" (`#faq`) ใช้ `<details>` เปิดข้อแรกไว้ ข้อความมาจาก `FAQ` ใน `landing.seo.ts` (ใช้ร่วมกับ JSON-LD — แก้ที่เดียว) |
| หน้าที่มีเฉพาะมือถือ | `/more` (รวมเมนูที่แถบล่างแสดงไม่พอ) ใส่ `<LeaveMoreOnWideScreen />` — จอตั้งแต่ md (768px) มีเมนูด้านข้างครบ จึงพากลับหน้าก่อนหน้าทันที รวมถึงตอนขยายจอหรือหมุนจอ · หน้าใหม่ที่มีเฉพาะมือถือให้ทำแบบเดียวกัน · เมนู drawer ของหน้าแรก (`landing.header.tsx`) ปิดเองเมื่อจอถึง lg (1024px) ที่หัวเว็บแสดงเมนูเต็ม |
| แอนิเมชันเปลี่ยนหน้า | ใส่ path ใน `EXACT`/`PATTERNS` ของ `src/web/lib/layout/layout/layout.motion-routes.ts` เฉพาะหน้าที่เข้าจากเมนู · หน้าที่เปิดจากปุ่มในแถวไม่ต้องใส่ |

## ข้อยกเว้นจากมาตรฐานกลาง (ระยะที่ 1)

| เรื่อง | มาตรฐาน | FitFlow ตอนนี้ | เหตุผล / แผน |
|---|---|---|---|
| ความยาวรหัสผ่าน (§10.1) | ≥ 12 ตัว | ผู้ใช้ตั้งเอง ≥ 8 ตัว · บัญชีที่พนักงานสร้าง 1–200 ตัว | ตามที่เจ้าของระบบกำหนด · ระยะที่ 2 ย้ายไป Better Auth + ตรวจ HIBP |
| รหัสผ่านเริ่มต้น | — | สมาชิกใหม่และบัญชีที่รีเซ็ตใช้ `12345678` แล้ว**บังคับเปลี่ยน**ที่ขั้นที่ 2 ของหน้า login | ยังไม่มีช่องทางส่ง SMS/อีเมล |
| ลืมรหัสผ่าน (§10.1 token 30 นาที) | ลิงก์/OTP ใช้ครั้งเดียว | ส่งคำขอ → พนักงานตรวจตัวตนแล้วรีเซ็ต | ยังไม่มีช่องทางส่งข้อความ |
| รูปแบบเบอร์โทร (§15.1) | `08X-XXX-XXXX` | เบอร์สมาชิกใส่อะไรก็ได้ ≤ 10 ตัว (ตัดขีด/ช่องว่างก่อนเก็บ) · แสดงแบบมีขีดเมื่อเป็นเบอร์มือถือไทย | รองรับเบอร์บ้าน/ต่างประเทศตามที่ร้านต้องการ |
