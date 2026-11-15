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
  'trainers.manage',
  'pt.manage',
  'payments.view',
  'payments.collect',
  'payments.confirm',
  'payments.configure',
  'reports.view',
  'packages.manage',
  'courses.manage',
  'sales.use',
  'products.manage',
  'portal.use',
  'coach.use',
  'marketing.manage',
  'retention.view',
  'users.manage',
  'roles.manage',
  'branches.manage',
  'branding.view',
  'branding.manage',
  'access.view',
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
  'trainers.manage': 'เพิ่ม แก้ไข และลบเทรนเนอร์',
  'pt.manage': 'จัดการคิว PT',
  'payments.view': 'ดูรายการชำระ',
  'payments.collect': 'รับชำระเงิน',
  'payments.confirm': 'ยืนยันการชำระเงิน',
  'payments.configure': 'ตั้งค่าวิธีชำระเงิน',
  'reports.view': 'ดูและส่งออกรายงาน',
  'packages.manage': 'จัดการแพ็กเกจ',
  'courses.manage': 'สร้างและจัดการคอร์สเรียน',
  'sales.use': 'ใช้หน้าร้าน POS (ซื้อ/ขายสินค้า)',
  'products.manage': 'จัดการสินค้าและสต็อก',
  'portal.use': 'ใช้พอร์ทัลสมาชิก',
  'coach.use': 'ใช้ฟีเจอร์ฝึกและอาหารของตัวเอง',
  'marketing.manage': 'จัดการการตลาดและคูปอง',
  'retention.view': 'ติดตามสมาชิก',
  'users.manage': 'ดูและเพิ่มบัญชีผู้ใช้',
  'roles.manage': 'จัดการ role และสิทธิ์',
  'branches.manage': 'เพิ่ม แก้ไข และลบสาขา',
  'branding.view': 'ดูแบรนด์ของสาขา',
  'branding.manage': 'ปรับแต่งแบรนด์ของสาขา',
  'access.view': 'ดูประวัติการเข้า/ออกจากระบบ (IP)',
};

const STAFF_COMMON: Permission[] = ['members.view', 'classes.view', 'trainers.view', 'coach.use', 'branding.view'];
const OWNER_PERMISSIONS: Permission[] = [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'trainers.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'packages.manage', 'courses.manage', 'sales.use', 'products.manage', 'marketing.manage', 'retention.view'];

export const DEFAULT_ROLE_PERMISSIONS: Record<BuiltInRole, readonly Permission[]> = {
  admin: [...OWNER_PERMISSIONS, 'users.manage', 'roles.manage', 'branches.manage', 'branding.manage', 'payments.configure', 'access.view'],
  owner: [...OWNER_PERMISSIONS, 'users.manage', 'branding.manage', 'payments.configure'],
  manager: [...STAFF_COMMON, 'dashboard.view', 'revenue.view', 'members.manage', 'checkin.use', 'classes.book', 'classes.manage', 'trainers.manage', 'pt.manage', 'payments.view', 'payments.collect', 'payments.confirm', 'reports.view', 'courses.manage', 'sales.use', 'products.manage', 'marketing.manage', 'retention.view'],
  'front-desk': [...STAFF_COMMON, 'dashboard.view', 'members.manage', 'checkin.use', 'classes.book', 'pt.manage', 'payments.view', 'payments.collect', 'sales.use', 'retention.view'],
  // เทรนเนอร์จัดการได้เฉพาะ PT ของตัวเอง (ตรวจ ownership ใน DAL)
  trainer: [...STAFF_COMMON, 'classes.book', 'pt.manage', 'sales.use'],
  member: ['portal.use', 'coach.use', 'branding.view', 'sales.use'],
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

export function permissionsFromUnknown(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPermission))];
}

export function permissionsForRole(role: Role, grants: readonly Permission[]): Permission[] {
  const adminPermissions: Permission[] = role === 'admin' ? ['branding.manage'] : [];
  return [...new Set<Permission>([...grants, ...adminPermissions])];
}

export function hasPermission(role: Role, permission: Permission, grants?: readonly Permission[]): boolean {
  const permissions = grants ?? (isBuiltInRole(role) ? DEFAULT_ROLE_PERMISSIONS[role] : []);
  return permissions.includes(permission);
}
