-- รูปสินค้า (base64 ใน MEDIUMTEXT เหมือนโลโก้สาขา)
ALTER TABLE `products` ADD COLUMN `image_data` MEDIUMTEXT NULL,
    ADD COLUMN `image_content_type` VARCHAR(40) NULL;
