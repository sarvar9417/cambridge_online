import pg from 'pg';
import { config } from '../config.js';
import { databaseSslOptions } from './ssl.js';

export const pool = config.DATABASE_URL
  ? new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: databaseSslOptions(config.DATABASE_URL, {
        mode: config.DB_SSL_MODE,
        caPem: config.DB_SSL_CA,
        caBase64: config.DB_SSL_CA_BASE64,
      }),
      max: config.DB_POOL_MAX,
      // Kept short on purpose: a request that cannot reach the database should
      // fail quickly rather than hold a serverless invocation open, and the
      // integration tests rely on the pool giving up fast.
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5000),
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      allowExitOnIdle: true,
    })
  : null;
