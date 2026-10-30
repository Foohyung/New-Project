-- เพิ่ม role ผู้ดูแลระบบ และการตั้งค่าแบรนด์แยกตามสาขา
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'owner', 'manager', 'front-desk', 'trainer', 'member') NOT NULL;

CREATE TABLE `branch_branding` (
  `branch` VARCHAR(120) NOT NULL,
  `primary_color` CHAR(7) NULL,
  `logo_url` VARCHAR(2048) NULL,
  `logo_data` MEDIUMTEXT NULL,
  `logo_content_type` VARCHAR(40) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by_id` VARCHAR(40) NULL,
  `created_by_name` VARCHAR(120) NULL,
  `updated_by_id` VARCHAR(40) NULL,
  `updated_by_name` VARCHAR(120) NULL,
  PRIMARY KEY (`branch`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
