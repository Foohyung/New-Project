-- เงื่อนไขคูปองเพิ่มเติม: ข้อความเงื่อนไข · ต้องเป็นสมาชิกอย่างน้อย N วัน · หลักฐานที่ต้องตรวจที่เคาน์เตอร์
ALTER TABLE `coupons` ADD COLUMN `terms` TEXT NULL,
    ADD COLUMN `min_member_days` INTEGER NULL,
    ADD COLUMN `proof_required` VARCHAR(200) NULL;
