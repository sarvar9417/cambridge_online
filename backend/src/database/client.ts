import pg from 'pg';
import { config } from '../config.js';
import { databaseSslOptions, isLocalDatabase } from './ssl.js';
import { serverlessDatabaseUrl } from './serverless-url.js';

const connectionString = config.DATABASE_URL
  ? serverlessDatabaseUrl(config.DATABASE_URL)
  : undefined;

const ssl = connectionString
  ? databaseSslOptions(connectionString, {
      mode: config.DB_SSL_MODE,
      caPem: config.DB_SSL_CA,
      caBase64: config.DB_SSL_CA_BASE64,
    })
  : undefined;

if (
  config.NODE_ENV === 'production' &&
  connectionString &&
  !isLocalDatabase(connectionString) &&
  ssl && ssl.rejectUnauthorized === false
) {
  console.warn('Database TLS is encrypted but server identity is not verified. Configure DB_SSL_CA/DB_SSL_CA_BASE64 and use DB_SSL_MODE=verify-full.');
}

const isVercel = Boolean(process.env.VERCEL);

export const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl,
      // Vercel fans one route across multiple warm function instances. Keep
      // each instance to one client; Supabase transaction mode multiplexes the
      // short queries safely across the upstream database pool.
      max: isVercel ? 1 : config.DB_POOL_MAX,
      // Cross-region/TLS handshakes can occasionally exceed three seconds.
      // Keep the fail-fast behaviour, but allow enough time for a healthy
      // Supabase transaction-pooler connection to complete.
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? (isVercel ? 10000 : 5000)),
      // Reusing a warm serverless connection avoids forcing a new TLS/database
      // handshake after every brief gap between parallel classroom API calls.
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? (isVercel ? 10000 : 30000)),
      allowExitOnIdle: true,
    })
  : null;
