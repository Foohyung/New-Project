-- สิทธิ์ใหม่ access.view (ดูประวัติการเข้า/ออกจากระบบพร้อม IP ที่หน้า /access-logs) ให้ admin, owner
UPDATE `role_definitions` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'access.view')
WHERE `id` IN ('admin', 'owner') AND NOT JSON_CONTAINS(`permissions`, '"access.view"');

-- หน้า /access-logs ค้นการเข้า/ออกจากระบบตามวัน (action = auth.login / auth.logout)
CREATE INDEX `audit_logs_action_occurred_at_idx` ON `audit_logs`(`action`, `occurred_at`);
