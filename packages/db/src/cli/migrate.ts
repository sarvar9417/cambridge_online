import pg from 'pg';
import { isTransactionPooler } from '../client.js';
import { runMigrations } from '../migrate.js';

/**
 * Migrations run against the direct connection (Supabase port 5432), never the
 * transaction pooler.
 *
 * `runMigrations` takes a session-level advisory lock to stop two deploys racing,
 * and under transaction pooling each statement may land on a different backend —
 * the lock would be taken and dropped on connections nobody is holding, so the
 * guard would silently do nothing.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');

if (isTransactionPooler(connectionString)) {
  throw new Error(
    'Refusing to migrate through the transaction pooler. Set DIRECT_URL to the ' +
      'Supabase direct connection (port 5432).',
  );
}

const isLocal = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(connectionString);
const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

try {
  const applied = await runMigrations(pool);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date');
} finally {
  await pool.end();
}
