import type { Connection } from 'mariadb';

export function hashPassword(password: string): string;
export function connectionConfig(url?: string): { host: string; port: number; user: string; password: string; database: string; timezone: string };
export function seedBase(conn: Connection): Promise<void>;
export function seedAdmin(conn: Connection): Promise<void>;
