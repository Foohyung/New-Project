-- คอร์สเรียน (สมาชิกสมัครเองในพอร์ทัล) และระบบขายหน้าร้าน (POS) + สต็อกสินค้า

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(40) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `trainer_id` VARCHAR(40) NULL,
    `room` VARCHAR(60) NULL,
    `schedule` VARCHAR(120) NOT NULL,
    `starts_on` DATE NOT NULL,
    `ends_on` DATE NOT NULL,
    `sessions` INTEGER NOT NULL,
    `capacity` INTEGER NOT NULL,
    `price_satang` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,
    `updated_by_id` VARCHAR(40) NULL,
    `updated_by_name` VARCHAR(120) NULL,

    INDEX `courses_starts_on_idx`(`starts_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_enrollments` (
    `id` VARCHAR(40) NOT NULL,
    `receipt_no` VARCHAR(30) NOT NULL,
    `course_id` VARCHAR(40) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `status` ENUM('pending', 'review', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    `method` ENUM('promptpay', 'card', 'cash', 'transfer') NOT NULL,
    `amount_satang` INTEGER NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `received_by` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,
    `updated_by_id` VARCHAR(40) NULL,
    `updated_by_name` VARCHAR(120) NULL,

    UNIQUE INDEX `course_enrollments_receipt_no_key`(`receipt_no`),
    INDEX `course_enrollments_status_idx`(`status`),
    UNIQUE INDEX `course_enrollments_course_id_member_id_key`(`course_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `price_satang` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `low_stock` INTEGER NOT NULL DEFAULT 5,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,
    `updated_by_id` VARCHAR(40) NULL,
    `updated_by_name` VARCHAR(120) NULL,

    UNIQUE INDEX `products_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` VARCHAR(40) NOT NULL,
    `receipt_no` VARCHAR(30) NOT NULL,
    `method` ENUM('promptpay', 'card', 'cash', 'transfer') NOT NULL,
    `total_satang` INTEGER NOT NULL,
    `voided_at` DATETIME(3) NULL,
    `voided_by_name` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,
    `updated_by_id` VARCHAR(40) NULL,
    `updated_by_name` VARCHAR(120) NULL,

    UNIQUE INDEX `sales_receipt_no_key`(`receipt_no`),
    INDEX `sales_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `id` VARCHAR(40) NOT NULL,
    `sale_id` VARCHAR(40) NOT NULL,
    `product_id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `price_satang` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(40) NOT NULL,
    `product_id` VARCHAR(40) NOT NULL,
    `change` INTEGER NOT NULL,
    `reason` ENUM('receive', 'sale', 'void', 'adjust') NOT NULL,
    `balance` INTEGER NOT NULL,
    `note` VARCHAR(200) NULL,
    `sale_id` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(40) NULL,
    `created_by_name` VARCHAR(120) NULL,

    INDEX `stock_movements_product_id_created_at_idx`(`product_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- สิทธิ์ใหม่: courses.manage (owner, manager, admin) · products.manage (owner, manager, admin) · sales.use (owner, manager, front-desk, admin)
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'courses.manage')
WHERE `id` IN ('admin', 'owner', 'manager') AND NOT JSON_CONTAINS(`permissions`, '"courses.manage"');
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'products.manage')
WHERE `id` IN ('admin', 'owner', 'manager') AND NOT JSON_CONTAINS(`permissions`, '"products.manage"');
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'sales.use')
WHERE `id` IN ('admin', 'owner', 'manager', 'front-desk') AND NOT JSON_CONTAINS(`permissions`, '"sales.use"');
