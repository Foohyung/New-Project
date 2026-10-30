/** บทบาทและสิทธิ์ของหลังบ้าน (pure — ใช้ได้ทั้ง server และ client) */

export const ROLES = ['admin', 'agent'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { admin: 'ผู้ดูแลระบบ', agent: 'Agent' };

export type Permission =
  | 'dashboard.view'
  | 'stock.view'
  | 'stock.manage'
  | 'owners.view'
  | 'owners.manage'
  | 'clients.manage'
  | 'contracts.manage'
  | 'documents.manage'
  | 'ledger.view'
  | 'ledger.manage'
  /** เห็นข้อมูลของ agent ทุกคน (ไม่ใช่เฉพาะทรัพย์ที่ตัวเองดูแล) */
  | 'agents.all';

const AGENT: Permission[] = ['dashboard.view', 'stock.view', 'stock.manage', 'owners.view', 'owners.manage', 'clients.manage', 'contracts.manage', 'documents.manage', 'ledger.view', 'ledger.manage'];

export const PERMISSIONS: Record<Role, readonly Permission[]> = {
  agent: AGENT,
  admin: [...AGENT, 'agents.all'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}
