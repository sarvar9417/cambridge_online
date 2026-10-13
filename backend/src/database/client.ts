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

// Fluid Compute may serve concurrent invocations in one warm function instance.
// Avoid head-of-line blocking from max=1, while bounding connections to the
// Supabase transaction pooler across many Vercel instances.
export function resolvePoolMax(vercel: boolean, configuredMax?: number) {
  const desired = configuredMax ?? (vercel ? 4 : 10);
  return vercel ? Math.max(2, Math.min(4, desired)) : desired;
}

export const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl,
      // Fluid Compute can handle concurrent requests on the same instance.
      // Use a small bounded client pool instead of serialising them on one slot.
      max: resolvePoolMax(isVercel, config.DB_POOL_MAX),
      // Cross-region/TLS handshakes can occasionally exceed five seconds.
      // Keep the fail-fast behaviour, but give both local session-pooler and
      // serverless transaction-pooler connections enough time to complete.
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10000),
      // Reusing a warm serverless connection avoids forcing a new TLS/database
      // handshake after every brief gap between parallel classroom API calls.
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? (isVercel ? 5000 : 30000)),
      allowExitOnIdle: true,
    })
  : null;

// pg removes a failed idle client itself. Listen so its background error cannot
// terminate the API process; never log the client object (it contains credentials).
pool?.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Idle database connection failed', { message: error.message, code: error.code });
});
