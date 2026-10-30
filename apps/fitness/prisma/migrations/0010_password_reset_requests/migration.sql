-- คำขอรีเซ็ตรหัสผ่านจากหน้า "ลืมรหัสผ่าน" (พนักงานรีเซ็ตให้)
CREATE TABLE `password_reset_requests` (
  `id` VARCHAR(40) NOT NULL,
  `user_id` VARCHAR(40) NOT NULL,
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolved_at` DATETIME(3) NULL,
  `resolution` VARCHAR(20) NULL,
  `resolved_by_id` VARCHAR(40) NULL,
  `resolved_by_name` VARCHAR(120) NULL,
  PRIMARY KEY (`id`),
  INDEX `password_reset_requests_resolved_at_requested_at_idx` (`resolved_at`, `requested_at`),
  INDEX `password_reset_requests_user_id_idx` (`user_id`),
  CONSTRAINT `password_reset_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
