import pg from 'pg';
import { config } from '../config.js';

export const pool = config.DATABASE_URL
  ? new pg.Pool({
      connectionString: config.DATABASE_URL,
      max: config.DB_POOL_MAX,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      allowExitOnIdle: true,
    })
  : null;
