import pg from 'pg';
import { config } from '../config.js';

export const pool = config.DATABASE_URL
  ? new pg.Pool({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 })
  : null;
