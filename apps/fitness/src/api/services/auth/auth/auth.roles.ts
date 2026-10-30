/** บทบาท สิทธิ์ และค่าเริ่มต้น (pure — ใช้ได้ทั้งฝั่ง server และ client) */

export const ROLES = ['admin', 'owner', 'manager', 'front-desk', 'trainer', 'member'] as const;
export type BuiltInRole = (typeof ROLES)[number];
export type Role = string & {};

export const ROLE_LABEL: Record<BuiltInRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  owner: 'เจ้าของ',
  manager: 'ผู้จัดการ',
  'front-desk': 'เคาน์เตอร์',
  trainer: 'เทรนเนอร์',
  member: 'สมาชิก',
};

export function isBuiltInRole(value: string): value is BuiltInRole {
  return (ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: Role, customLabel?: string): string {
  return customLabel || (isBuiltInRole(role) ? ROLE_LABEL[role] : role);
}

export const PERMISSIONS = [
  'dashboard.view',
  'revenue.view',
  'members.view',
  'members.manage',
  'checkin.use',
  'classes.view',
  'classes.book',
  'classes.manage',
  'trainers.view',
  'pt.manage',
  'payments.view',
  'payments.collect',
  'payments.confirm',
  'reports.view',
  'packages.manage',
  'portal.use',
  'coach.use',
  'marketing.manage',
  'retention.view',
  'users.manage',
  'roles.manage',
  'branding.view',
  'branding.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = {
  'dashboard.view': 'ดูแดชบอร์ด',
  'revenue.view': 'ดูรายได้',
  'members.view': 'ดูรายชื่อและโปรไฟล์สมาชิก',
  'members.manage': 'เพิ่มและจัดการสมาชิก',
  'checkin.use': 'เช็กอินที่เคาน์เตอร์',
  'classes.view': 'ดูตารางคลาส',
  'classes.book': 'จองและยกเลิกคลาส',
  'classes.manage': 'สร้างและจัดการคลาส',
  'trainers.view': 'ดูข้อมูลเทรนเนอร์',
  'pt.manage': 'จัดการคิว PT',
  'payments.view': 'ดูรายการชำระ',
  'payments.collect': 'รับชำระเงิน',
  'payments.confirm': 'ยืนยันการชำระเงิน',
  'reports.view': 'ดูและส่งออกรายงาน',
  'packages.manage': 'จัดการแพ็กเกจ',
  'portal.use': 'ใช้พอร์ทัลสมาชิก',
  'coach.use': 'ใช้ฟีเจอร์ฝึกและอาหารของตัวเอง',
  'marketing.manage': 'จัดการการตลาดและคูปอง',
  'retention.view': 'ติดตามสมาชิก',
  'users.manage': 'ดูและเพิ่มบัญชีผู้ใช้',
  'roles.manage': 'จัดการ role และสิทธิ์',
  'branding.view': 'ดูแบรนด์ของสาขา',
  'branding.manage': 'ปรับแต่งแบรนด์ของสาขา',
};

const STAFF_COMMON: Permission[] = ['members.view', 'classes.view', 'trainers.view', 'coach.use', 'branding.view'];
const OWNER_PERMISSIONS: Permission[] = [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'packages.manage', 'marketing.manage', 'retention.view'];

export const DEFAULT_ROLE_PERMISSIONS: Record<BuiltInRole, readonly Permission[]> = {
  admin: [...OWNER_PERMISSIONS, 'users.manage', 'roles.manage'],
  owner: [...OWNER_PERMISSIONS, 'users.manage', 'branding.manage'],
  manager: [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'marketing.manage', 'retention.view'],
  'front-desk': [...STAFF_COMMON, 'dashboard.view', 'members.manage', 'checkin.use', 'classes.book', 'pt.manage', 'payments.view', 'payments.collect', 'retention.view'],
  // เทรนเนอร์จัดการได้เฉพาะ PT ของตัวเอง (ตรวจ ownership ใน DAL)
  trainer: [...STAFF_COMMON, 'classes.book', 'pt.manage'],
  member: ['portal.use', 'coach.use', 'branding.view'],
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

export function permissionsFromUnknown(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPermission))];
}

export function permissionsForRole(_role: Role, grants: readonly Permission[]): Permission[] {
  return [...grants];
}

export function permissionsAllowedForRole(role: string, grants: readonly Permission[]): boolean {
  if (role === 'admin') return grants.includes('roles.manage');
  return !grants.includes('roles.manage');
}

export function hasPermission(role: Role, permission: Permission, grants?: readonly Permission[]): boolean {
  const permissions = grants ?? (isBuiltInRole(role) ? DEFAULT_ROLE_PERMISSIONS[role] : []);
  return permissions.includes(permission);
}
