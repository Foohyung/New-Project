-- เปลี่ยนคอลัมน์ DATETIME ทุกตารางจาก UTC เป็นเวลาไทย (UTC+7) — แอปอ่าน/เขียนเป็นเวลาไทยตั้งแต่เวอร์ชันนี้ (src/api/lib/db/db/db.thai-time.ts)
-- ค่าเดิมเป็น UTC จึงบวก 7 ชั่วโมงครั้งเดียว · NULL คงเป็น NULL · คอลัมน์ DATE (วันล้วน) ไม่แตะ
-- ห้ามรันซ้ำ (prisma migrate รันครั้งเดียวอยู่แล้ว)

UPDATE `users` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `password_reset_requests` SET `requested_at` = `requested_at` + INTERVAL 7 HOUR, `resolved_at` = `resolved_at` + INTERVAL 7 HOUR;
UPDATE `owner_branches` SET `created_at` = `created_at` + INTERVAL 7 HOUR;
UPDATE `role_definitions` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `branches` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `branch_branding` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `sessions` SET `expires_at` = `expires_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR;
-- audit_logs เป็น append-only (trigger ใน 0001_init) — ปลด trigger ชั่วคราวเพื่อเลื่อนเวลาครั้งเดียว แล้วใส่คืนทันที
DROP TRIGGER IF EXISTS `audit_logs_no_update`;
UPDATE `audit_logs` SET `occurred_at` = `occurred_at` + INTERVAL 7 HOUR;
CREATE TRIGGER `audit_logs_no_update` BEFORE UPDATE ON `audit_logs` FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
UPDATE `counters` SET `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `packages` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `members` SET `last_check_in_at` = `last_check_in_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `check_ins` SET `at` = `at` + INTERVAL 7 HOUR, `checked_out_at` = `checked_out_at` + INTERVAL 7 HOUR;
UPDATE `trainers` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `classes` SET `starts_at` = `starts_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `bookings` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `pt_sessions` SET `starts_at` = `starts_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `payments` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `paid_at` = `paid_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `coupons` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `charges` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `reminder_rounds` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `reminder_logs` SET `sent_at` = `sent_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `follow_ups` SET `updated_at` = `updated_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR;
UPDATE `workout_plans` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `health_profiles` SET `consent_at` = `consent_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR;
UPDATE `meal_logs` SET `logged_at` = `logged_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `courses` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `course_enrollments` SET `paid_at` = `paid_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `products` SET `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `sales` SET `voided_at` = `voided_at` + INTERVAL 7 HOUR, `created_at` = `created_at` + INTERVAL 7 HOUR, `updated_at` = `updated_at` + INTERVAL 7 HOUR;
UPDATE `stock_movements` SET `created_at` = `created_at` + INTERVAL 7 HOUR;
