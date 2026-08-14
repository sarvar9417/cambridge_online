import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { isTransactionPooler } from '../client.js';
import { MIGRATIONS_DIR, runMigrations } from '../migrate.js';

/**
 * Migrations run against the session-mode connection, never the transaction
 * pooler.
 *
 * `runMigrations` takes a session-level advisory lock to stop two deploys
 * racing, and under transaction pooling each statement may land on a different
 * backend — the lock would be taken and released on connections nobody holds,
 * so the guard would silently do nothing.
 *
 *   pnpm db:migrate                     apply everything outstanding
 *   pnpm db:migrate -- --only 0007.sql  apply one file, for adopting a database
 *                                       whose earlier migrations ran under
 *                                       different names
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');

if (isTransactionPooler(connectionString)) {
  throw new Error(
    'Refusing to migrate through the transaction pooler. Set DIRECT_URL to the ' +
      'session-mode connection (port 5432).',
  );
}

const isLocal = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(connectionString);
const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];

try {
  if (only) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const already = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [only]);
    if (already.rowCount) {
      console.log(`${only} is already recorded as applied`);
    } else {
      const sql = await readFile(join(MIGRATIONS_DIR, only), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [only]);
        await client.query('COMMIT');
        console.log(`Applied ${only}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } else {
    const applied = await runMigrations(pool);
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date');
  }
} finally {
  await pool.end();
}
