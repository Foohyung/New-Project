<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ปฏิทินและการเลือกวันที่

- เมื่อเพิ่มหรือปรับ UI ที่ผู้ใช้ต้องเลือกวัน/ช่วงวันที่ ให้ใช้ปฏิทิน custom ของโปรเจกต์จาก `src/web/components/ui/ui/ui.calendar.tsx` (`DatePickerField`, `DateRangePicker`) ห้ามใช้ native `<input type="date">` หรือปล่อยให้ browser แสดง date picker เอง
- ใช้ `DatePickerGroup` เมื่อมี date picker หลายช่องในฟอร์มเดียว เพื่อให้เปิดปฏิทินได้ทีละช่อง
- คงรูปแบบภาษาไทยและปี พ.ศ. พร้อมสถานะวันนี้/วันที่เลือก การนำทางเดือน คีย์บอร์ด และข้อจำกัด min/max ผ่าน API ของ component เดิม
- วันที่ที่เลือกต้องส่งค่า `YYYY-MM-DD` ให้ฟอร์ม/เซิร์ฟเวอร์ และต้อง validate ซ้ำฝั่งเซิร์ฟเวอร์
- ก่อนสร้างปฏิทินใหม่ ให้ตรวจ component เดิมและแนวทางใน [docs/UI-CALENDAR.md](./docs/UI-CALENDAR.md) แล้วนำกลับมาใช้หรือขยายของเดิม
