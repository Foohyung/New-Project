-- คูปองตัวอย่างตามที่เจ้าของกำหนด (INSERT IGNORE: มีอยู่แล้วไม่ทับ — แก้/ปิดได้จากหน้าแพ็กเกจและหน้าคูปอง)

-- แพ็กเกจครึ่งเดือน (ใช้ได้ 15 วัน) สำหรับคูปองนักเรียน — ราคาเริ่มต้น ฿700 แก้ได้ที่ /packages
INSERT IGNORE INTO `packages` (`id`, `name`, `kind`, `months`, `days`, `sessions`, `price_satang`, `description`, `active`, `sort_order`, `created_at`, `updated_at`, `created_by_name`, `updated_by_name`)
VALUES ('half-month', 'ครึ่งเดือน', 'daypass', NULL, 15, NULL, 70000, 'เข้าใช้ได้ 15 วัน รวมคลาสกลุ่ม', true, 6, NOW(3), NOW(3), 'ระบบ', 'ระบบ');

-- STUDENT69: ลด 30% เฉพาะแพ็กเกจครึ่งเดือน · นักเรียน/นักศึกษา อายุไม่เกิน 20 ปี มีหลักฐาน · 1 ครั้งต่อคน · จำกัด 30 สิทธิ์
INSERT IGNORE INTO `coupons` (`code`, `description`, `type`, `value`, `kind`, `package_ids`, `renew_only`, `new_only`, `usage_limit`, `used`, `per_member`, `terms`, `min_member_days`, `proof_required`, `expires_on`, `active`, `created_at`, `updated_at`, `created_by_name`, `updated_by_name`)
VALUES ('STUDENT69', 'ส่วนลดนักเรียน นักศึกษา', 'percent', 30, 'promo', JSON_ARRAY('half-month'), false, false, 30, 0, 1,
  'ใช้ได้เฉพาะสมาชิกครึ่งเดือนเท่านั้น · ต้องเป็นนักเรียน นักศึกษา อายุไม่เกิน 20 ปี · มีหลักฐานยืนยัน เช่น บัตรประจำตัวนักเรียนนักศึกษา บัตรประจำตัวประชาชน · ใช้ได้ 1 ครั้งต่อคน · จำกัด 30 สิทธิ์',
  NULL, 'บัตรนักเรียน/นักศึกษา หรือบัตรประชาชน — อายุไม่เกิน 20 ปี', NULL, true, NOW(3), NOW(3), 'ระบบ', 'ระบบ');

-- 1MONTH: ลด ฿90 · ต้องเป็นสมาชิกอย่างน้อย 30 วัน · 1 ครั้งต่อคน
INSERT IGNORE INTO `coupons` (`code`, `description`, `type`, `value`, `kind`, `package_ids`, `renew_only`, `new_only`, `usage_limit`, `used`, `per_member`, `terms`, `min_member_days`, `proof_required`, `expires_on`, `active`, `created_at`, `updated_at`, `created_by_name`, `updated_by_name`)
VALUES ('1MONTH', 'ส่วนลดสมาชิกครบ 1 เดือน', 'baht', 9000, 'promo', NULL, false, false, NULL, 0, 1,
  'ต้องเป็นสมาชิกอย่างน้อย 30 วัน', 30, NULL, NULL, true, NOW(3), NOW(3), 'ระบบ', 'ระบบ');
