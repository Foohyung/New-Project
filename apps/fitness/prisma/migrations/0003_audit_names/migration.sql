-- เพิ่ม created_by_name และ updated_by_name ให้ทุกตาราง

-- AlterTable
ALTER TABLE `users` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `created_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `counters` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `packages` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `members` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `check_ins` ADD COLUMN `created_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `trainers` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `classes` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `pt_sessions` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `coupons` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `charges` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `reminder_rounds` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `reminder_logs` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `follow_ups` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `workout_plans` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `health_profiles` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `meal_logs` ADD COLUMN `created_by_name` VARCHAR(120) NULL,
    ADD COLUMN `updated_by_name` VARCHAR(120) NULL;
