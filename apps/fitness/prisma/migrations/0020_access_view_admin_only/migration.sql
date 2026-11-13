-- ประวัติการเข้าสู่ระบบ (/access-logs) ให้ดูได้เฉพาะ role admin — เอาสิทธิ์ access.view ออกจากทุก role อื่น (0019 เคยให้ owner)
UPDATE `role_definitions`
SET `permissions` = JSON_REMOVE(`permissions`, JSON_UNQUOTE(JSON_SEARCH(`permissions`, 'one', 'access.view')))
WHERE `id` <> 'admin' AND JSON_CONTAINS(`permissions`, '"access.view"');
