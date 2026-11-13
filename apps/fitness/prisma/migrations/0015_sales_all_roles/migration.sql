-- ทุก role ระบบซื้อสินค้าหน้าร้านได้ โดยไม่เพิ่มสิทธิ์จัดการสินค้า
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'sales.use')
WHERE NOT JSON_CONTAINS(`permissions`, '"sales.use"');
