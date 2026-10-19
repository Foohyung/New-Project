import 'server-only';
import { hasPermission, type Permission } from '@/features/auth/roles';
import type { Session } from './auth';

export class ForbiddenError extends Error {
  constructor() {
    super('FORBIDDEN');
  }
}

/** ตรวจสิทธิ์ใน DAL ทุกฟังก์ชัน (§10.2) — reject แทน throw เพื่อให้ caller ใช้ await ได้เหมือนกันทุกจุด */
export function authorize(session: Session, permission: Permission): Promise<void> {
  return hasPermission(session.role, permission) ? Promise.resolve() : Promise.reject(new ForbiddenError());
}

export function can(session: Session, permission: Permission): boolean {
  return hasPermission(session.role, permission);
}
