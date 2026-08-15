import pg from 'pg';
import { config } from '../config.js';

const isLocalDatabase = (connectionString: string) =>
  /@(localhost|127\.0\.0\.1|postgres|host\.docker\.internal)[:/]/.test(connectionString);

/**
 * Supabase requires TLS and presents a certificate chain Node has no root for,
 * so verification is disabled while the connection stays encrypted. Without
 * this the pooler accepts the socket and then never completes the handshake,
 * which surfaces as a connection timeout rather than a TLS error.
 *
 * A local PostgreSQL needs no TLS at all, so the option is omitted there.
 */
const sslFor = (connectionString: string) =>
  isLocalDatabase(connectionString) ? undefined : { rejectUnauthorized: false };

export const pool = config.DATABASE_URL
  ? new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: sslFor(config.DATABASE_URL),
      max: config.DB_POOL_MAX,
      // Kept short on purpose: a request that cannot reach the database should
      // fail quickly rather than hold a serverless invocation open, and the
      // integration tests rely on the pool giving up fast.
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5000),
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      allowExitOnIdle: true,
    })
  : null;
