ALTER TABLE `branch_branding`
  ADD COLUMN `payment_methods` JSON NULL,
  ADD COLUMN `prompt_pay_id` VARCHAR(20) NULL,
  ADD COLUMN `prompt_pay_qr_data` MEDIUMTEXT NULL,
  ADD COLUMN `prompt_pay_qr_content_type` VARCHAR(40) NULL;

UPDATE `role_definitions`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'payments.configure')
WHERE `id` IN ('admin', 'owner') AND NOT JSON_CONTAINS(`permissions`, '"payments.configure"');
