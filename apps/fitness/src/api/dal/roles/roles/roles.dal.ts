import 'server-only';
import { Prisma } from '@/api/lib/db/db/generated/prisma/client';
import { ForbiddenError, authorize } from '@/api/lib/auth/auth/auth.rbac';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { prisma } from '@/api/lib/db/db/db';
import { isPermission, permissionsAllowedForRole, permissionsFromUnknown, type Permission } from '@/api/services/auth/auth/auth.roles';
import type { RoleDefinitionDto } from '@/api/types/users/users/users.types';

async function authorizeRoleManagement(session: Session): Promise<void> {
  await authorize(session, 'roles.manage');
  if (session.role !== 'admin') throw new ForbiddenError();
}

function validatePermissions(roleId: string, permissions: readonly Permission[]): void {
  if (permissions.some(permission => !isPermission(permission)) || !permissionsAllowedForRole(roleId, permissions)) {
    throw new Error('INVALID_ROLE_PERMISSIONS');
  }
}

export async function listRoleDefinitions(session: Session): Promise<RoleDefinitionDto[]> {
  await authorizeRoleManagement(session);
  const rows = await prisma().roleDefinition.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: [{ system: 'desc' }, { name: 'asc' }],
  });
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    system: row.system,
    permissions: permissionsFromUnknown(row.permissions),
    userCount: row._count.users,
  }));
}

export async function createRoleDefinition(
  session: Session,
  input: { id: string; name: string; permissions: Permission[] },
): Promise<void> {
  await authorizeRoleManagement(session);
  validatePermissions(input.id, input.permissions);
  try {
    await prisma().roleDefinition.create({
      data: {
        id: input.id,
        name: input.name,
        system: false,
        permissions: input.permissions,
        createdById: session.userId,
        createdByName: session.name,
        updatedById: session.userId,
        updatedByName: session.name,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('ROLE_TAKEN');
    throw error;
  }
}

export async function updateRoleDefinition(
  session: Session,
  input: { id: string; name: string; permissions: Permission[] },
): Promise<void> {
  await authorizeRoleManagement(session);
  if (input.id === 'admin') throw new Error('ADMIN_ROLE_PROTECTED');
  validatePermissions(input.id, input.permissions);
  const role = await prisma().roleDefinition.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!role) throw new Error('NOT_FOUND');
  await prisma().roleDefinition.update({
    where: { id: input.id },
    data: {
      name: input.name,
      permissions: input.permissions,
      updatedById: session.userId,
      updatedByName: session.name,
    },
  });
}

export async function deleteRoleDefinition(session: Session, id: string): Promise<void> {
  await authorizeRoleManagement(session);
  if (id === 'admin') throw new Error('ADMIN_ROLE_PROTECTED');
  const db = prisma();
  const role = await db.roleDefinition.findUnique({ where: { id }, select: { system: true } });
  if (!role) throw new Error('NOT_FOUND');
  if (role.system) throw new Error('ROLE_PROTECTED');
  if (await db.user.count({ where: { role: id } })) throw new Error('ROLE_IN_USE');
  try {
    await db.roleDefinition.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new Error('ROLE_IN_USE');
    throw error;
  }
}
