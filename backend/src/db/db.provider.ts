import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@db/schema';

export const DB = Symbol('DB');

export type Database = NodePgDatabase<typeof schema>;

/**
 * Factory for the Drizzle client. The connection pool is created once and
 * reused for the lifetime of the process.
 */
export function createDatabase(): Database {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
