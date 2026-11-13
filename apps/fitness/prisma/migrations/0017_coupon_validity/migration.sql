-- เพิ่มวันเริ่มใช้คูปอง และ backfill ข้อมูลเดิมด้วยวันสร้างก่อนบังคับให้ระบุ
ALTER TABLE `coupons` ADD COLUMN `starts_on` DATE NULL;
UPDATE `coupons` SET `starts_on` = DATE(`created_at`) WHERE `starts_on` IS NULL;
ALTER TABLE `coupons` MODIFY COLUMN `starts_on` DATE NOT NULL;
