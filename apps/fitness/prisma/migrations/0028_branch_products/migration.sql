-- แยกสินค้าและสต็อกตามสาขา · สินค้าเดิมย้ายตามสาขาผู้สร้าง หากไม่มีผู้สร้างให้ย้ายไปสาขาหลัก
ALTER TABLE `products`
    ADD COLUMN `branch` VARCHAR(120) NULL;

UPDATE `products` p
INNER JOIN `users` u ON u.`id` = p.`created_by_id`
SET p.`branch` = NULLIF(TRIM(u.`branch`), '')
WHERE p.`branch` IS NULL;

UPDATE `products`
SET `branch` = (
    SELECT `name`
    FROM `branches`
    ORDER BY `created_at` ASC, `name` ASC
    LIMIT 1
)
WHERE `branch` IS NULL;

UPDATE `products`
SET `branch` = 'สาขาหลัก'
WHERE `branch` IS NULL;

INSERT IGNORE INTO `branches` (`id`, `name`, `created_at`, `updated_at`, `created_by_name`, `updated_by_name`)
SELECT UUID(), p.`branch`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), 'ระบบ', 'ระบบ'
FROM `products` p
LEFT JOIN `branches` b ON b.`name` = p.`branch`
WHERE b.`name` IS NULL;

ALTER TABLE `products`
    MODIFY COLUMN `branch` VARCHAR(120) NOT NULL,
    DROP INDEX `products_name_key`,
    ADD UNIQUE INDEX `products_branch_name_key` (`branch`, `name`);

ALTER TABLE `products`
    ADD CONSTRAINT `products_branch_fkey`
    FOREIGN KEY (`branch`) REFERENCES `branches` (`name`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
