UPDATE `role_definitions`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'branding.manage')
WHERE `id` = 'admin' AND NOT JSON_CONTAINS(`permissions`, '"branding.manage"');
