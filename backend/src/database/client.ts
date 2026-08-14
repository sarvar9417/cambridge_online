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
      // The pooler can be slow to hand out a backend under load; 5s was short
      // enough to time out before the first connection was ever established.
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      allowExitOnIdle: true,
    })
  : null;
