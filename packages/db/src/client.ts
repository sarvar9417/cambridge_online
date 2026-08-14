import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
  close: () => Promise<void>;
}

const isLocal = (connectionString: string) =>
  /@(localhost|127\.0\.0\.1|postgres|host\.docker\.internal)[:/]/.test(connectionString);

/**
 * Supabase's transaction-mode pooler (port 6543) hands a different backend to
 * each transaction, so anything that relies on session state breaks: named
 * prepared statements, `SET`, and session-level advisory locks. Detecting it
 * here lets the pool be configured correctly instead of failing intermittently
 * under load.
 */
export const isTransactionPooler = (connectionString: string) =>
  connectionString.includes(':6543') || connectionString.includes('pgbouncer=true');

/**
 * Creates a pool and a Drizzle handle. Callers own the lifetime: the API keeps
 * one for the process, tests create one per container and close it in teardown.
 */
export function createDb(connectionString: string, max = 10): DbHandle {
  const pool = new pg.Pool({
    connectionString,
    max,
    // Supabase terminates TLS with a certificate chain Node does not ship a root
    // for; the connection is still encrypted. Local databases need no TLS.
    ssl: isLocal(connectionString) ? undefined : { rejectUnauthorized: false },
    // The pooler closes idle server connections itself; holding them open here
    // just burns the project's connection budget.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}

export { schema };
