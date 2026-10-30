-- เปลี่ยน role จาก enum เป็น role ที่กำหนดสิทธิ์ได้ และเก็บ role definitions ในฐานข้อมูล
CREATE TABLE `role_definitions` (
  `id` VARCHAR(40) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `system` BOOLEAN NOT NULL DEFAULT false,
  `permissions` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by_id` VARCHAR(40) NULL,
  `created_by_name` VARCHAR(120) NULL,
  `updated_by_id` VARCHAR(40) NULL,
  `updated_by_name` VARCHAR(120) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `role_definitions` (`id`, `name`, `system`, `permissions`, `updated_at`) VALUES
('admin', 'ผู้ดูแลระบบ', true, JSON_ARRAY('members.view','classes.view','trainers.view','coach.use','branding.view','dashboard.view','revenue.view','members.manage','checkin.use','classes.book','classes.manage','pt.manage','payments.view','payments.collect','payments.confirm','reports.view','packages.manage','marketing.manage','retention.view','users.manage','roles.manage'), NOW(3)),
('owner', 'เจ้าของ', true, JSON_ARRAY('members.view','classes.view','trainers.view','coach.use','branding.view','dashboard.view','revenue.view','members.manage','checkin.use','classes.book','classes.manage','pt.manage','payments.view','payments.collect','payments.confirm','reports.view','packages.manage','marketing.manage','retention.view','users.manage','branding.manage'), NOW(3)),
('manager', 'ผู้จัดการ', true, JSON_ARRAY('members.view','classes.view','trainers.view','coach.use','branding.view','dashboard.view','revenue.view','members.manage','checkin.use','classes.book','classes.manage','pt.manage','payments.view','payments.collect','payments.confirm','reports.view','marketing.manage','retention.view'), NOW(3)),
('front-desk', 'เคาน์เตอร์', true, JSON_ARRAY('members.view','classes.view','trainers.view','coach.use','branding.view','dashboard.view','members.manage','checkin.use','classes.book','pt.manage','payments.view','payments.collect','retention.view'), NOW(3)),
('trainer', 'เทรนเนอร์', true, JSON_ARRAY('members.view','classes.view','trainers.view','coach.use','branding.view','classes.book','pt.manage'), NOW(3)),
('member', 'สมาชิก', true, JSON_ARRAY('portal.use','coach.use','branding.view'), NOW(3));

ALTER TABLE `users`
  MODIFY COLUMN `role` VARCHAR(40) NOT NULL;

ALTER TABLE `users`
  ADD CONSTRAINT `users_role_fkey`
  FOREIGN KEY (`role`) REFERENCES `role_definitions` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `audit_logs`
  MODIFY COLUMN `actor_role` VARCHAR(40) NULL;
