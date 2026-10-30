import 'server-only';
import { auditRecord, type AuditRecord } from '@/api/services/audit/audit/audit.trail';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma } from '@/api/lib/db/db/db';

export type AuditEntry = AuditRecord;

const json = (row: Record<string, unknown> | null) => (row ? (row as Prisma.InputJsonObject) : Prisma.DbNull);

/**
 * บันทึกว่าใครทำอะไรลงตาราง audit_logs (append-only §12.4, docs/AUDIT.md)
 * ส่ง before/after มาด้วยเพื่อเก็บเฉพาะฟิลด์ที่เปลี่ยน (ค่าลับ/ข้อมูลสุขภาพถูกปิดให้เอง)
 */
export async function audit(
  session: Session,
  action: string,
  entityType: string,
  entityId: string,
  change?: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null },
): Promise<void> {
  const r = auditRecord({ actor: { id: session.userId, name: session.name, role: session.role }, action, entityType, entityId, ...change });
  await prisma().auditLog.create({
    data: { ...r, occurredAt: new Date(r.occurredAt), before: json(r.before), after: json(r.after) },
  });
}
