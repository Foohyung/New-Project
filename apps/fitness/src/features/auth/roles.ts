/** บทบาทและสิทธิ์ (pure — ใช้ได้ทั้งฝั่ง server และ client) ดูตารางเต็มที่ docs/RBAC.md */

export const ROLES = ['owner', 'manager', 'front-desk', 'trainer', 'member'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'เจ้าของ',
  manager: 'ผู้จัดการ',
  'front-desk': 'เคาน์เตอร์',
  trainer: 'เทรนเนอร์',
  member: 'สมาชิก',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export type Permission =
  | 'dashboard.view'
  | 'revenue.view'
  | 'members.view'
  | 'members.manage'
  | 'checkin.use'
  | 'classes.view'
  | 'classes.book'
  | 'classes.manage'
  | 'trainers.view'
  | 'pt.manage'
  | 'payments.view'
  | 'payments.collect'
  | 'payments.confirm'
  | 'reports.view'
  | 'packages.manage'
  | 'portal.use'
  | 'demo.reset';

const STAFF_COMMON: Permission[] = ['members.view', 'classes.view', 'trainers.view'];

export const PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'packages.manage', 'demo.reset'],
  manager: [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'demo.reset'],
  'front-desk': [...STAFF_COMMON, 'dashboard.view', 'members.manage', 'checkin.use', 'classes.book', 'pt.manage', 'payments.view', 'payments.collect'],
  // เทรนเนอร์จัดการได้เฉพาะ PT ของตัวเอง (ตรวจ ownership ใน DAL)
  trainer: [...STAFF_COMMON, 'classes.book', 'pt.manage'],
  member: ['portal.use'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}
