-- สาขาเป็นข้อมูลหลัก จัดการได้เฉพาะ admin (เมนูตั้งค่า > สาขา) · ตารางอื่นยังอ้างสาขาด้วยชื่อเหมือนเดิม
CREATE TABLE `branches` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(20) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,
    `updated_by_id` VARCHAR(40) NULL,
    `updated_by_name` VARCHAR(120) NULL,

    UNIQUE INDEX `branches_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- สาขาที่ใช้อยู่แล้ว (ชื่อที่พิมพ์ไว้ในบัญชีผู้ใช้ สาขาของเจ้าของ และแบรนด์สาขา) กลายเป็นแถวในตารางสาขา
INSERT IGNORE INTO `branches` (`id`, `name`, `updated_at`, `created_by_name`, `updated_by_name`)
SELECT UUID(), names.branch, CURRENT_TIMESTAMP(3), 'ระบบ', 'ระบบ'
FROM (
    SELECT `branch` FROM `users`
    UNION SELECT `branch` FROM `owner_branches`
    UNION SELECT `branch` FROM `branch_branding`
) AS names
WHERE TRIM(names.branch) <> '';

-- สิทธิ์จัดการสาขาให้ role admin เท่านั้น
UPDATE `role_definitions`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'branches.manage')
WHERE `id` = 'admin' AND NOT JSON_CONTAINS(`permissions`, '"branches.manage"');
