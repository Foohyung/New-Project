-- สิทธิ์ใหม่ trainers.manage (เพิ่ม แก้ไข ลบเทรนเนอร์) ให้ admin, owner, manager
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'trainers.manage')
WHERE `id` IN ('admin', 'owner', 'manager') AND NOT JSON_CONTAINS(`permissions`, '"trainers.manage"');
