-- ช่วงวันที่ใช้งานบัญชีได้ (active from / active to) — NULL = ไม่จำกัด
ALTER TABLE `users`
  ADD COLUMN `active_from` DATE NULL AFTER `active`,
  ADD COLUMN `active_to` DATE NULL AFTER `active_from`;
