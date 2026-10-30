-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(40) NOT NULL,
    `login` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(200) NOT NULL,
    `role` ENUM('owner', 'manager', 'front-desk', 'trainer', 'member') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `nickname` VARCHAR(60) NOT NULL,
    `branch` VARCHAR(120) NOT NULL,
    `trainer_id` VARCHAR(40) NULL,
    `member_id` VARCHAR(40) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_login_key`(`login`),
    UNIQUE INDEX `users_member_id_key`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(40) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `user_id` VARCHAR(40) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_hash_key`(`token_hash`),
    INDEX `sessions_user_id_idx`(`user_id`),
    INDEX `sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(40) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actor_id` VARCHAR(40) NULL,
    `actor_name` VARCHAR(120) NOT NULL,
    `actor_role` VARCHAR(20) NULL,
    `branch_id` VARCHAR(40) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(40) NOT NULL,
    `entity_id` VARCHAR(80) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `request_id` VARCHAR(40) NULL,

    INDEX `audit_logs_entity_type_entity_id_occurred_at_idx`(`entity_type`, `entity_id`, `occurred_at`),
    INDEX `audit_logs_actor_id_occurred_at_idx`(`actor_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `counters` (
    `name` VARCHAR(40) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `kind` ENUM('time', 'pt', 'daypass') NOT NULL,
    `months` INTEGER NULL,
    `days` INTEGER NULL,
    `sessions` INTEGER NULL,
    `price_satang` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` VARCHAR(40) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(160) NULL,
    `joined_on` DATE NOT NULL,
    `package_id` VARCHAR(40) NOT NULL,
    `expires_on` DATE NOT NULL,
    `freeze_from` DATE NULL,
    `freeze_until` DATE NULL,
    `pt_sessions_left` INTEGER NOT NULL DEFAULT 0,
    `last_check_in_at` DATETIME(3) NULL,
    `note` TEXT NULL,
    `marketing_consent` BOOLEAN NOT NULL DEFAULT false,
    `card_brand` ENUM('visa', 'mastercard') NULL,
    `card_last4` CHAR(4) NULL,
    `card_exp` VARCHAR(5) NULL,
    `auto_renew_since` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `members_code_key`(`code`),
    UNIQUE INDEX `members_phone_key`(`phone`),
    INDEX `members_expires_on_idx`(`expires_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_ins` (
    `id` VARCHAR(40) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `at` DATETIME(3) NOT NULL,
    `allowed` BOOLEAN NOT NULL,

    INDEX `check_ins_member_id_at_idx`(`member_id`, `at`),
    INDEX `check_ins_at_idx`(`at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainers` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `nickname` VARCHAR(60) NOT NULL,
    `specialties` JSON NOT NULL,
    `bio` TEXT NOT NULL,
    `color` VARCHAR(40) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` VARCHAR(60) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `trainer_id` VARCHAR(40) NOT NULL,
    `room` VARCHAR(60) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `minutes` INTEGER NOT NULL,
    `capacity` INTEGER NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `other_booked` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `classes_starts_at_idx`(`starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(40) NOT NULL,
    `class_id` VARCHAR(60) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `status` ENUM('booked', 'cancelled') NOT NULL DEFAULT 'booked',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bookings_class_id_status_idx`(`class_id`, `status`),
    INDEX `bookings_member_id_status_idx`(`member_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pt_sessions` (
    `id` VARCHAR(40) NOT NULL,
    `trainer_id` VARCHAR(40) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `minutes` INTEGER NOT NULL,
    `status` ENUM('booked', 'done', 'cancelled') NOT NULL DEFAULT 'booked',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pt_sessions_trainer_id_starts_at_idx`(`trainer_id`, `starts_at`),
    INDEX `pt_sessions_member_id_starts_at_idx`(`member_id`, `starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(40) NOT NULL,
    `receipt_no` VARCHAR(30) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `package_id` VARCHAR(40) NOT NULL,
    `kind` ENUM('signup', 'renew', 'pt', 'daypass') NOT NULL,
    `amount_satang` INTEGER NOT NULL,
    `method` ENUM('promptpay', 'card', 'cash', 'transfer') NOT NULL,
    `status` ENUM('pending', 'review', 'paid') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,
    `applied` BOOLEAN NOT NULL DEFAULT false,
    `coverage_from` DATE NULL,
    `coverage_to` DATE NULL,
    `received_by` VARCHAR(120) NULL,
    `list_price_satang` INTEGER NOT NULL,
    `discount_satang` INTEGER NOT NULL DEFAULT 0,
    `coupon_code` VARCHAR(40) NULL,
    `bonus_days` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `payments_receipt_no_key`(`receipt_no`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    INDEX `payments_member_id_created_at_idx`(`member_id`, `created_at`),
    INDEX `payments_paid_at_idx`(`paid_at`),
    INDEX `payments_coupon_code_idx`(`coupon_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `code` VARCHAR(40) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('percent', 'baht', 'days') NOT NULL,
    `value` INTEGER NOT NULL,
    `kind` ENUM('promo', 'referral', 'winback') NOT NULL DEFAULT 'promo',
    `package_ids` JSON NULL,
    `renew_only` BOOLEAN NOT NULL DEFAULT false,
    `new_only` BOOLEAN NOT NULL DEFAULT false,
    `usage_limit` INTEGER NULL,
    `used` INTEGER NOT NULL DEFAULT 0,
    `per_member` INTEGER NOT NULL DEFAULT 1,
    `expires_on` DATE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `owner_member_id` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charges` (
    `id` VARCHAR(40) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `package_id` VARCHAR(40) NOT NULL,
    `amount_satang` INTEGER NOT NULL,
    `due_on` DATE NOT NULL,
    `attempts` JSON NOT NULL,
    `status` ENUM('retrying', 'failed', 'paid') NOT NULL DEFAULT 'retrying',
    `payment_id` VARCHAR(40) NULL,

    INDEX `charges_status_due_on_idx`(`status`, `due_on`),
    INDEX `charges_member_id_due_on_idx`(`member_id`, `due_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_rounds` (
    `id` VARCHAR(20) NOT NULL,
    `offset_days` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `channels` JSON NOT NULL,
    `template` TEXT NOT NULL,
    `coupon_code` VARCHAR(40) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_logs` (
    `id` VARCHAR(40) NOT NULL,
    `member_id` VARCHAR(40) NOT NULL,
    `round_id` VARCHAR(20) NOT NULL,
    `channels` JSON NOT NULL,
    `sent_at` DATETIME(3) NOT NULL,
    `clicked` BOOLEAN NOT NULL DEFAULT false,
    `payment_id` VARCHAR(40) NULL,

    INDEX `reminder_logs_member_id_sent_at_idx`(`member_id`, `sent_at`),
    INDEX `reminder_logs_sent_at_idx`(`sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow_ups` (
    `member_id` VARCHAR(40) NOT NULL,
    `stage` ENUM('todo', 'contacted', 'won') NOT NULL,
    `note` TEXT NOT NULL,
    `by` VARCHAR(120) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`member_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_plans` (
    `user_id` VARCHAR(40) NOT NULL,
    `date` DATE NOT NULL,
    `exercise_ids` JSON NOT NULL,
    `done_ids` JSON NOT NULL,

    PRIMARY KEY (`user_id`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_profiles` (
    `user_id` VARCHAR(40) NOT NULL,
    `sex` ENUM('male', 'female') NOT NULL,
    `birth_year` INTEGER NOT NULL,
    `height_cm` DOUBLE NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `goal` ENUM('lose', 'maintain', 'gain') NOT NULL,
    `activity` ENUM('sedentary', 'light', 'moderate', 'active') NOT NULL,
    `consent_at` DATETIME(3) NOT NULL,
    `notice_version` VARCHAR(40) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meal_logs` (
    `id` VARCHAR(40) NOT NULL,
    `user_id` VARCHAR(40) NOT NULL,
    `date` DATE NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `kcal` INTEGER NOT NULL,
    `protein_g` DOUBLE NOT NULL,
    `carb_g` DOUBLE NOT NULL,
    `fat_g` DOUBLE NOT NULL,
    `logged_at` DATETIME(3) NOT NULL,

    INDEX `meal_logs_user_id_date_idx`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pt_sessions` ADD CONSTRAINT `pt_sessions_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pt_sessions` ADD CONSTRAINT `pt_sessions_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_owner_member_id_fkey` FOREIGN KEY (`owner_member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_logs` ADD CONSTRAINT `reminder_logs_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_logs` ADD CONSTRAINT `reminder_logs_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_ups` ADD CONSTRAINT `follow_ups_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- ยอดเงินติดลบไม่ได้ (MySQL 8.0.16+ บังคับใช้ CHECK)
ALTER TABLE `payments` ADD CONSTRAINT `payments_amount_nonneg` CHECK (`amount_satang` >= 0 AND `list_price_satang` >= 0 AND `discount_satang` >= 0);

-- audit_logs เป็น append-only: แก้หรือลบไม่ได้แม้ผ่าน SQL ตรง (docs/AUDIT.md)
CREATE TRIGGER `audit_logs_no_update` BEFORE UPDATE ON `audit_logs` FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';

CREATE TRIGGER `audit_logs_no_delete` BEFORE DELETE ON `audit_logs` FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
