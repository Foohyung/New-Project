import 'server-only';
import type { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma } from '@/api/lib/db/db/db';
import { describeAgent } from '@/api/services/access/access/access.service';
import type { DateRange } from '@/api/services/shared/shared/shared.date-range';
import type { AccessLogDto } from '@/api/types/access/access/access.types';

const ACTIONS = ['auth.login', 'auth.logout'];
const PAGE_SIZE = 10;

/**
 * ประวัติเข้า/ออกจากระบบตามช่วงวันที่ (เวลาไทย) พร้อม IP และอุปกรณ์ — อ่านจาก audit_logs (auth.login / auth.logout)
 * ตรวจด้วย permission access.view — ผู้ใช้ที่ได้รับสิทธิ์ดูข้อมูล IP ได้
 */
export async function getAccessLog(session: Session, filter: DateRange & { ip?: string; page?: number }): Promise<AccessLogDto> {
  await authorize(session, 'access.view');
  const from = new Date(`${filter.from}T00:00:00+07:00`);
  const to = new Date(new Date(`${filter.to}T00:00:00+07:00`).getTime() + 86_400_000);
  const where: Prisma.AuditLogWhereInput = { action: { in: ACTIONS }, occurredAt: { gte: from, lt: to }, ...(filter.ip ? { ip: filter.ip } : {}) };
  const requestedPage = Number.isSafeInteger(filter.page) && (filter.page ?? 0) > 0 ? filter.page ?? 1 : 1;
  const [total, actionCounts, uniqueIps] = await Promise.all([
    prisma().auditLog.count({ where }),
    prisma().auditLog.groupBy({ by: ['action'], where, _count: { action: true } }),
    prisma().auditLog.findMany({ where, distinct: ['ip'], select: { ip: true } }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const rows = await prisma().auditLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, occurredAt: true, action: true, actorId: true, actorName: true, actorRole: true, ip: true, userAgent: true },
  });
  const ids = [...new Set(rows.map(r => r.actorId).filter((id): id is string => !!id))];
  const users = new Map(
    (ids.length ? await prisma().user.findMany({ where: { id: { in: ids } }, select: { id: true, branch: true, roleDefinition: { select: { name: true } } } }) : [])
      .map(u => [u.id, { branch: u.branch, roleName: u.roleDefinition.name }]),
  );
  const events = rows.map(r => {
    const user = r.actorId ? users.get(r.actorId) : undefined;
    return {
      id: r.id,
      at: r.occurredAt.toISOString(),
      kind: r.action === 'auth.logout' ? ('logout' as const) : ('login' as const),
      userName: r.actorName,
      roleName: user?.roleName ?? r.actorRole ?? '',
      branch: user?.branch ?? '',
      ip: r.ip,
      device: r.userAgent ? describeAgent(r.userAgent) : 'ไม่ทราบ',
    };
  });
  return {
    from: filter.from,
    to: filter.to,
    events,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    logins: actionCounts.find(a => a.action === 'auth.login')?._count.action ?? 0,
    logouts: actionCounts.find(a => a.action === 'auth.logout')?._count.action ?? 0,
    ipCount: new Set(uniqueIps.map(row => row.ip).filter((value): value is string => value !== null)).size,
  };
}
