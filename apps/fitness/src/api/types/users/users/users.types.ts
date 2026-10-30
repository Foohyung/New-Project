import type { Role } from '@/api/services/auth/auth/auth.roles';
import type { Permission } from '@/api/services/auth/auth/auth.roles';

export interface ManagedUser {
  id: string;
  login: string;
  name: string;
  nickname: string;
  role: Role;
  roleName: string;
  branch: string;
  active: boolean;
  /** 'YYYY-MM-DD' หรือ null = ไม่จำกัด */
  activeFrom: string | null;
  activeTo: string | null;
  trainerId: string | null;
  memberId: string | null;
}

export interface UserOptions {
  trainers: { id: string; nickname: string }[];
  members: { id: string; code: string; name: string }[];
  roles: { id: Role; name: string; system: boolean }[];
}

export interface RoleDefinitionDto {
  id: Role;
  name: string;
  system: boolean;
  permissions: Permission[];
  userCount: number;
}
