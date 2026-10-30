import { z } from 'zod';
import { PERMISSIONS } from '@/api/services/auth/auth/auth.roles';

const PermissionSchema = z.enum(PERMISSIONS);

export const CreateRoleSchema = z.object({
  id: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9-]{1,39}$/, 'ใช้ a-z, ตัวเลข และขีดกลาง เริ่มด้วยตัวอักษร (2–40 ตัว)'),
  name: z.string().trim().min(2, 'ชื่อ role ต้องมีอย่างน้อย 2 ตัวอักษร').max(80, 'ชื่อ role ยาวเกินไป'),
  permissions: z.array(PermissionSchema).max(PERMISSIONS.length),
});

export const UpdateRoleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  name: z.string().trim().min(2, 'ชื่อ role ต้องมีอย่างน้อย 2 ตัวอักษร').max(80, 'ชื่อ role ยาวเกินไป'),
  permissions: z.array(PermissionSchema).max(PERMISSIONS.length),
});

export const DeleteRoleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
});
