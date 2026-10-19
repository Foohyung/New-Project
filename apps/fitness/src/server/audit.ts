import 'server-only';
import type { Session } from './auth';

export interface AuditEntry {
  occurredAt: string;
  actorId: string;
  actorRole: Session['role'];
  action: string;
  entityType: string;
  entityId: string;
}

// ระยะที่ 1 เก็บในหน่วยความจำ — ระยะที่ 2 ย้ายไปตาราง audit_logs แบบ append-only (§12.4)
const entries: AuditEntry[] = [];

export function audit(session: Session, action: string, entityType: string, entityId: string): Promise<void> {
  entries.push({ occurredAt: new Date().toISOString(), actorId: session.userId, actorRole: session.role, action, entityType, entityId });
  return Promise.resolve();
}
