import 'server-only';
import type { Session } from './auth';

export interface AuditEntry {
  occurredAt: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
}

// ระยะที่ 1 เก็บในหน่วยความจำ — ระยะที่ 2 ย้ายไปตาราง audit_logs แบบ append-only (§12.4)
const holder = globalThis as unknown as { __bhAudit?: AuditEntry[] };
export const auditLog = (holder.__bhAudit ??= []);

export function audit(session: Session, action: string, entityType: string, entityId: string): void {
  auditLog.push({ occurredAt: new Date().toISOString(), actorId: session.userId, action, entityType, entityId });
}
