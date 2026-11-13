-- คูปองเลือกประเภทการซื้อได้ · ข้อมูลเดิมที่ applies_to เป็น NULL ยังคงใช้ได้กับสมาชิก/แพ็กเกจเท่านั้น
ALTER TABLE `coupons`
    ADD COLUMN `applies_to` JSON NULL;

-- เก็บราคาเดิมและส่วนลดไว้ในรายการซื้อสินค้า/คอร์ส
ALTER TABLE `sales`
    ADD COLUMN `list_price_satang` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discount_satang` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `coupon_code` VARCHAR(40) NULL,
    ADD COLUMN `coupon_member_id` VARCHAR(40) NULL;

UPDATE `sales`
SET `list_price_satang` = `total_satang`;

CREATE INDEX `sales_coupon_code_coupon_member_id_idx`
    ON `sales` (`coupon_code`, `coupon_member_id`);

ALTER TABLE `sales`
    ADD CONSTRAINT `sales_coupon_member_id_fkey`
    FOREIGN KEY (`coupon_member_id`) REFERENCES `members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `course_enrollments`
    ADD COLUMN `list_price_satang` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discount_satang` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `coupon_code` VARCHAR(40) NULL;

UPDATE `course_enrollments`
SET `list_price_satang` = `amount_satang`;

CREATE INDEX `course_enrollments_coupon_code_idx`
    ON `course_enrollments` (`coupon_code`);
