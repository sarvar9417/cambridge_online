import pg from 'pg';
import { getTableColumns, getTableName, is, Table } from 'drizzle-orm';
import { readdir } from 'node:fs/promises';
import { isTransactionPooler } from '../client.js';
import { MIGRATIONS_DIR } from '../migrate.js';
import * as schema from '../schema/index.js';

/**
 * Adopts a database that already has the schema, without re-running migrations.
 *
 * This project's database was built by an earlier stack whose migration files
 * had different names. `runMigrations` keys on filename, so it would try to
 * replay `0001_enums.sql` against types that already exist and fail.
 *
 * Rather than editing history or forcing the files through, this records the
 * pre-existing migrations as applied — but only after proving the live schema
 * actually satisfies the Drizzle definitions. If a single table or column is
 * missing it refuses, because a false baseline would hide a real gap until the
 * first query against it failed in production.
 *
 * Run with: pnpm --filter @campath/db baseline -- <up-to-filename>
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');
if (isTransactionPooler(connectionString)) {
  throw new Error('Use the session-mode connection (port 5432) for baselining.');
}

/** Files up to and including this one are treated as already satisfied. */
const upTo = process.argv[2] ?? '0006_ops.sql';

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  const live = new Map<string, Set<string>>();
  const columns = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'public'`,
  );
  for (const row of columns.rows) {
    if (!live.has(row.table_name)) live.set(row.table_name, new Set());
    live.get(row.table_name)!.add(row.column_name);
  }

  const gaps: string[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, Table)) continue;
    const name = getTableName(value);
    const have = live.get(name);
    if (!have) {
      gaps.push(`missing table ${name}`);
      continue;
    }
    for (const column of Object.values(getTableColumns(value))) {
      if (!have.has(column.name)) gaps.push(`missing column ${name}.${column.name}`);
    }
  }

  if (gaps.length) {
    console.error('Refusing to baseline; the live schema does not satisfy the definitions:');
    for (const gap of gaps) console.error(`  ${gap}`);
    console.error('\nApply the migration that closes these gaps first.');
    process.exitCode = 1;
  } else {
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith('.sql') && file <= upTo)
      .sort();

    for (const file of files) {
      await pool.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [file],
      );
    }
    console.log(`Baselined ${files.length} migrations up to ${upTo}: ${files.join(', ')}`);
    console.log('Live schema verified against every Drizzle table and column.');
  }
} finally {
  await pool.end();
}
