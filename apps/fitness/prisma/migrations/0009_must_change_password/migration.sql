-- บังคับเปลี่ยนรหัสผ่านครั้งแรก (บัญชีสมาชิกที่สร้างตอนสมัครด้วยรหัสเริ่มต้น)
ALTER TABLE `users`
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false AFTER `active_to`;
