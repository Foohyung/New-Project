/*
 * Audit trail — ตัวกลางสร้างแถว audit_logs (ใคร · ทำอะไร · กับแถวไหน · ค่าเดิม/ค่าใหม่)
 * ฟังก์ชันล้วน ไม่แตะฐานข้อมูล: ใช้ได้ทั้ง store ระยะที่ 1 และ Prisma extension ระยะที่ 2 (docs/AUDIT.md)
 */
import type { Role } from '@/api/services/auth/auth/auth.roles';

export interface Actor {
  /** null = ระบบ */
  id: string | null;
  /** snapshot ชื่อ ณ เวลานั้น — ผู้ใช้ถูกลบหรือเปลี่ยนชื่อภายหลัง log ยังอ่านออก */
  name: string;
  role: Role | null;
}

export const SYSTEM_ACTOR: Actor = { id: null, name: 'ระบบ', role: null };

/** ค่าลับ — ระบุว่าเปลี่ยน แต่ไม่เก็บค่า */
export const REDACTED_FIELDS: ReadonlySet<string> = new Set(['passwordHash', 'totpSecretEnc', 'gatewayToken', 'tokenHash']);
/** ข้อมูลสุขภาพ (PDPA ม.26) — ทุกฟิลด์ไม่เก็บค่า เพื่อให้ลบข้อมูลจริงได้เมื่อถอนความยินยอม */
export const HEALTH_ENTITIES: ReadonlySet<string> = new Set(['health_profiles', 'meal_logs']);
/** คอลัมน์ที่ระบบเติมเอง ไม่นับเป็นการเปลี่ยนแปลง */
const BOOKKEEPING: ReadonlySet<string> = new Set(['createdAt', 'updatedAt', 'createdById', 'updatedById']);

export const REDACTED = '[redacted]';

type Row = Record<string, unknown>;

/** แปลงค่าให้เทียบ/เก็บเป็น JSON ได้ (Date → ISO, Decimal → string) */
function plain(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && typeof (v as { toFixed?: unknown }).toFixed === 'function') return (v as { toString(): string }).toString();
  return v;
}

/** เก็บเฉพาะฟิลด์ที่ค่าเปลี่ยน · create = before ว่าง · delete = after ว่าง */
export function changedFields(before: Row | null, after: Row | null): { before: Row; after: Row } {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out = { before: {} as Row, after: {} as Row };
  for (const k of keys) {
    if (BOOKKEEPING.has(k)) continue;
    const b = plain(before?.[k]);
    const a = plain(after?.[k]);
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    if (before) out.before[k] = b ?? null;
    if (after) out.after[k] = a ?? null;
  }
  return out;
}

function redact(entityType: string, row: Row): Row {
  const health = HEALTH_ENTITIES.has(entityType);
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, health || REDACTED_FIELDS.has(k) ? REDACTED : v]));
}

export interface AuditInput {
  actor: Actor;
  action: string;
  entityType: string;
  entityId: string;
  before?: Row | null;
  after?: Row | null;
  branchId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  at?: Date;
}

/** คอลัมน์ตรงกับ model AuditLog ใน prisma/schema.prisma */
export interface AuditRecord {
  occurredAt: string;
  actorId: string | null;
  actorName: string;
  actorRole: Role | null;
  branchId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Row | null;
  after: Row | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function auditRecord(input: AuditInput): AuditRecord {
  const hasChange = input.before !== undefined || input.after !== undefined;
  const diff = hasChange ? changedFields(input.before ?? null, input.after ?? null) : null;
  const pack = (row: Row | undefined) => (row && Object.keys(row).length > 0 ? redact(input.entityType, row) : null);
  return {
    occurredAt: (input.at ?? new Date()).toISOString(),
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    branchId: input.branchId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: pack(diff?.before),
    after: pack(diff?.after),
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
  };
}
