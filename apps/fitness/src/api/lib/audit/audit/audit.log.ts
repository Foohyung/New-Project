import 'server-only';
import { auditRecord } from '@/api/services/audit/audit/audit.trail';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { headers } from 'next/headers';
import { prisma } from '@/api/lib/db/db/db';
import { clientIp } from '@/api/services/access/access/access.service';

/** IP และเบราว์เซอร์ของคำขอปัจจุบัน · นอก request (cron, script) = null */
async function requestOrigin(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    return { ip: clientIp(name => h.get(name)).slice(0, 45), userAgent: h.get('user-agent')?.slice(0, 255) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

const json = (row: Record<string, unknown> | null) => (row ? (row as Prisma.InputJsonObject) : Prisma.DbNull);

/**
 * บันทึกว่าใครทำอะไรลงตาราง audit_logs (append-only §12.4, docs/AUDIT.md)
 * เก็บ IP และเบราว์เซอร์ของคำขอให้เองทุกแถว (หน้า /access-logs ใช้ของ auth.login / auth.logout)
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
  const origin = await requestOrigin();
  await prisma().auditLog.create({
    data: { ...r, ...origin, occurredAt: new Date(r.occurredAt), before: json(r.before), after: json(r.after) },
  });
}
