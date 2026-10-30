import type { Connection } from 'mariadb';

export function wipe(conn: Connection): Promise<void>;
export function loadSampleData(conn: Connection): Promise<void>;
