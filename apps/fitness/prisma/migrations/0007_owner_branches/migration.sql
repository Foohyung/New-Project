-- เจ้าของ 1 คนดูแลได้หลายสาขา: สาขาหลักยังอยู่ที่ users.branch ตารางนี้เก็บสาขาเพิ่มเติม
CREATE TABLE `owner_branches` (
  `owner_id` VARCHAR(40) NOT NULL,
  `branch` VARCHAR(120) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_id` VARCHAR(40) NULL,
  `created_by_name` VARCHAR(120) NULL,
  PRIMARY KEY (`owner_id`, `branch`),
  INDEX `owner_branches_branch_idx` (`branch`),
  CONSTRAINT `owner_branches_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
