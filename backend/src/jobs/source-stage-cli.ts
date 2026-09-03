import { readFile } from 'node:fs/promises';
import { pool } from '../database/client.js';
import { registerStagedSources, type SourceStageItem, validateStageManifest } from './source-stage-manifest.js';

const manifestPath = process.argv.find((value) => value.startsWith('--manifest='))?.slice('--manifest='.length);
const write = process.argv.includes('--write');
if (!manifestPath) throw new Error('Usage: source-stage-cli --manifest=<json> [--write]');

const items = JSON.parse(await readFile(manifestPath, 'utf8')) as SourceStageItem[];
const validated = await validateStageManifest(items);

if (!write) {
  console.log(JSON.stringify({
    write: false,
    count: validated.length,
    items: validated.map((item) => ({
      key: `${item.year}-${item.series}-${item.paperCode}-${item.kind}`,
      path: item.storagePath,
      sourceUrl: item.sourceUrl,
      sha256: item.sha256,
    })),
  }, null, 2));
  if (pool) await pool.end();
  process.exit(0);
}

if (!pool) throw new Error('DATABASE_URL is required for --write');
if (process.env.CONFIRM_SOURCE_STAGE !== 'YES') throw new Error('Set CONFIRM_SOURCE_STAGE=YES to use --write');
const staged = await registerStagedSources(pool, items);
console.log(JSON.stringify({ write: true, count: staged.length, items: staged }, null, 2));
await pool.end();
