import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

if (!pool) throw new Error('DATABASE_URL is required');

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
await pool.query("SELECT pg_advisory_lock(hashtext('campath_schema_migrations'))");

try { for (const file of files) {
  const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
  if (exists.rowCount) continue;
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`Applied ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} } finally { await pool.query("SELECT pg_advisory_unlock(hashtext('campath_schema_migrations'))"); }

await pool.end();
